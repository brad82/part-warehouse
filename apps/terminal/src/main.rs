//! Green-screen telnet terminal: AS/400-style screens for handhelds like
//! the MC9090, reading and writing the shared parts database.

mod app;
mod config;
mod net;
mod store;
mod ui;

use std::net::TcpListener;
use std::sync::Arc;
use std::thread;

use config::Config;
use store::Store;

fn main() {
    let config = Arc::new(Config::from_env());

    // Each connection opens its own handle; this only flags a bad DB_PATH
    // early. The API may not have created the db yet, so keep listening.
    if let Err(err) = Store::open(&config.db_path) {
        eprintln!(
            "Can't open {} yet (start the API first?): {err}",
            config.db_path.display()
        );
    }

    let listener = match TcpListener::bind((config.host.as_str(), config.port)) {
        Ok(listener) => listener,
        Err(err) => {
            eprintln!("Can't listen on {}:{}: {err}", config.host, config.port);
            std::process::exit(1);
        }
    };
    println!(
        "Green screen listening on telnet://{}:{}",
        config.host, config.port
    );

    for stream in listener.incoming() {
        let stream = match stream {
            Ok(stream) => stream,
            Err(err) => {
                eprintln!("accept failed: {err}");
                continue;
            }
        };
        let config = Arc::clone(&config);
        thread::spawn(move || {
            let peer = stream
                .peer_addr()
                .map_or_else(|_| "?".to_owned(), |a| a.to_string());
            println!("{peer} connected");
            if let Err(err) = net::serve(stream, &config) {
                eprintln!("{peer} {err}");
            }
            println!("{peer} disconnected");
        });
    }
}
