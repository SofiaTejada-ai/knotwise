// Deterministic technical diagrams. They render instantly (no network), and
// they are the accurate fallback whenever a generated diagram fails
// validation. Each one shows the real mechanism, never a metaphor.

const sqlInjection = {
  id: "sql-injection",
  title: "SQL injection",
  match: /sql\s*-?\s*injection|sqli\b/i,
  nodes: [
    { id: "user", label: "Legitimate user", kind: "client", pos: [0, 0] },
    { id: "form", label: "Login form (untrusted input)", kind: "data", pos: [1, 0] },
    { id: "app", label: "Web application server", kind: "server", pos: [2, 0] },
    { id: "attacker", label: "Attacker", kind: "attacker", pos: [0, 1] },
    { id: "db", label: "Database", kind: "database", pos: [1, 1] },
    { id: "query", label: "SQL query", kind: "process", pos: [2, 1] }
  ],
  edges: [
    { id: "e1", from: "user", to: "form", label: "name: alice" },
    { id: "e2", from: "form", to: "app", label: "HTTP request" },
    { id: "e3", from: "app", to: "query", label: "builds query" },
    { id: "e4", from: "query", to: "db", label: "executes" },
    { id: "e5", from: "db", to: "app", label: "rows returned" },
    { id: "e6", from: "attacker", to: "form", label: "' OR '1'='1" }
  ],
  steps: [
    {
      idea: "A normal request",
      spokenText:
        "A real user types their name into the login form. The form sends that text to the web application server.",
      nodes: ["user", "form", "app"],
      edges: ["e1", "e2"],
      callout: { lines: [{ label: "Input", text: "name = alice", tone: "neutral" }], note: "" }
    },
    {
      idea: "The app builds a query",
      spokenText:
        "The server pastes that text into a SQL query by joining strings together. The query asks the database for the user named alice.",
      nodes: ["app", "query"],
      edges: ["e3"],
      callout: {
        lines: [
          {
            label: "Unsafe string concatenation",
            text: "SELECT * FROM users WHERE name = 'alice'",
            mark: "alice",
            tone: "neutral"
          }
        ],
        note: "The input is pasted straight into the query text."
      }
    },
    {
      idea: "Attacker input changes the query",
      spokenText:
        "Now an attacker types SQL characters instead of a name. Because the text is pasted in, those characters become part of the query's logic. The condition now always evaluates to true.",
      nodes: ["attacker", "form", "app", "query"],
      edges: ["e6", "e2", "e3"],
      callout: {
        lines: [
          {
            label: "Altered query",
            text: "SELECT * FROM users WHERE name = '' OR '1'='1'",
            mark: "' OR '1'='1",
            tone: "danger"
          }
        ],
        note: "Untrusted input changed the structure of the query."
      }
    },
    {
      idea: "The database runs it",
      spokenText:
        "The database receives the altered query and cannot tell it was changed. It runs the query and returns every user row to the application.",
      nodes: ["query", "db", "app"],
      edges: ["e4", "e5"],
      callout: { lines: [{ label: "Result", text: "ALL rows in users returned", tone: "danger" }], note: "" }
    },
    {
      idea: "Parameterized query",
      spokenText:
        "A parameterized query sends the SQL structure and the input separately. The database treats the attacker's text only as a value to look for, never as SQL code. So the same input matches no user.",
      nodes: ["app", "query", "db"],
      edges: ["e3", "e4"],
      callout: {
        lines: [
          {
            label: "Unsafe",
            text: "... WHERE name = '' OR '1'='1'",
            mark: "' OR '1'='1",
            tone: "danger"
          },
          {
            label: "Parameterized",
            text: "... WHERE name = ?   with value \"' OR '1'='1\"",
            tone: "safe"
          }
        ],
        note: "The input is bound as data, so it is never parsed as SQL."
      }
    }
  ]
};

export const TEMPLATES = [sqlInjection];