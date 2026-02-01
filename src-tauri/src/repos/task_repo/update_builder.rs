use rusqlite::types::Value;

/// Accumulates SET clauses and parameters for a task update statement.
pub struct TaskUpdateBuilder {
    sets: Vec<String>,
    params: Vec<Value>,
    touch_updated_at: bool,
    updated_at_written: bool,
}

impl TaskUpdateBuilder {
    pub fn new() -> Self {
        Self {
            sets: Vec::new(),
            params: Vec::new(),
            touch_updated_at: false,
            updated_at_written: false,
        }
    }

    pub fn add_set(&mut self, set_clause: impl Into<String>, value: Value) {
        self.sets.push(set_clause.into());
        self.params.push(value);
        self.touch_updated_at = true;
    }

    pub fn add_raw_set(&mut self, set_clause: impl Into<String>) {
        self.sets.push(set_clause.into());
        self.touch_updated_at = true;
    }

    pub fn has_sets(&self) -> bool {
        !self.sets.is_empty()
    }

    pub fn updated_at_written(&self) -> bool {
        self.updated_at_written
    }

    pub fn finalize_updated_at(&mut self, now: i64) {
        if self.touch_updated_at && !self.updated_at_written && self.has_sets() {
            self.sets.push("updated_at = ?".to_string());
            self.params.push(Value::Integer(now));
            self.updated_at_written = true;
        }
    }

    pub fn build(self, id: &str) -> Option<(String, Vec<Value>)> {
        if self.sets.is_empty() {
            return None;
        }

        let mut sql = String::from("UPDATE tasks SET ");
        sql.push_str(&self.sets.join(", "));
        sql.push_str(" WHERE id = ?");

        let mut params = self.params;
        params.push(Value::Text(id.to_string()));

        Some((sql, params))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_returns_none_without_sets() {
        let builder = TaskUpdateBuilder::new();
        assert!(builder.build("task-1").is_none());
    }

    #[test]
    fn finalize_adds_updated_at_when_touched() {
        let mut builder = TaskUpdateBuilder::new();
        builder.add_set("title = ?", Value::Text("hello".to_string()));
        builder.finalize_updated_at(123);
        let (sql, params) = builder.build("task-1").expect("should build sql");
        assert!(sql.contains("updated_at"));
        assert_eq!(params.len(), 3);
    }
}
