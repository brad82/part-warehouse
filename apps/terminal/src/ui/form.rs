use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Message {
    pub text: String,
    pub error: bool,
}

/// A screen's field values, focused field and message line.
#[derive(Debug, Default)]
pub struct Form {
    values: HashMap<String, String>,
    pub focused: Option<String>,
    pub message: Option<Message>,
}

impl Form {
    pub fn get(&self, name: &str) -> &str {
        self.values.get(name).map_or("", String::as_str)
    }

    pub fn set(&mut self, name: &str, value: impl Into<String>) {
        self.values.insert(name.to_owned(), value.into());
    }

    pub fn value_mut(&mut self, name: &str) -> &mut String {
        self.values.entry(name.to_owned()).or_default()
    }

    pub fn focus(&mut self, name: &str) {
        self.focused = Some(name.to_owned());
    }

    pub fn info(&mut self, text: impl Into<String>) {
        self.message = Some(Message {
            text: text.into(),
            error: false,
        });
    }

    pub fn error(&mut self, text: impl Into<String>) {
        self.message = Some(Message {
            text: text.into(),
            error: true,
        });
    }
}
