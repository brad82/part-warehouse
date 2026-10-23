//! One telnet connection: socket bytes → telnet → keys → [`App`].

mod input;
mod telnet;

use std::io::{self, ErrorKind, Read, Write};
use std::net::{Shutdown, TcpStream};
use std::time::Duration;

pub use input::Key;
use input::KeyDecoder;
use telnet::{HANDSHAKE, Telnet};

use crate::app::{App, Control, Ctx};
use crate::config::Config;
use crate::store::Store;

/// How long a lone ESC waits for the rest of a sequence.
const ESC_TIMEOUT: Duration = Duration::from_millis(60);

pub fn serve(mut stream: TcpStream, config: &Config) -> io::Result<()> {
    let store = match Store::open(&config.db_path) {
        Ok(store) => store,
        Err(err) => {
            stream.write_all(b"Parts database not available. Try again shortly.\r\n")?;
            return Err(io::Error::other(err));
        }
    };
    let mut app = App::new(
        Ctx {
            store: &store,
            system_name: &config.system_name,
        },
        config.size,
    );
    let mut telnet = Telnet::default();
    let mut keys = KeyDecoder::default();

    stream.set_nodelay(true)?;
    stream.write_all(&HANDSHAKE)?;
    app.start();
    stream.write_all(&app.take_output())?;

    let mut buf = [0u8; 1024];
    loop {
        stream.set_read_timeout(keys.pending().then_some(ESC_TIMEOUT))?;
        let input = match stream.read(&mut buf) {
            Ok(0) => return Ok(()),
            Ok(n) => {
                let decoded = telnet.decode(&buf[..n]);
                stream.write_all(&decoded.replies)?;
                if let Some(size) = decoded.size
                    && !config.ignore_naws
                {
                    app.resize(size);
                }
                keys.feed(&decoded.data)
            }
            Err(e) if matches!(e.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut) => {
                keys.flush()
            }
            Err(e) if e.kind() == ErrorKind::Interrupted => continue,
            Err(e) => return Err(e),
        };

        let control = input
            .into_iter()
            .map(|k| app.key(k))
            .find(|c| *c == Control::Close)
            .unwrap_or(Control::Continue);
        stream.write_all(&app.take_output())?;
        if control == Control::Close {
            return stream.shutdown(Shutdown::Both);
        }
    }
}
