import React, { useState } from "react";
import axios from "axios";

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    try {
      // 1) Call the backend login endpoint
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });

      // 2) The response should have { token, role }
      const { token, role } = res.data;

      // 3) Notify parent (App) that login succeeded
      onLoginSuccess(token, role);
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Invalid credentials or server error");
    }
  }

  return (
    <div style={{ margin: 30 }}>
      <h2>Login</h2>
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username: </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Password: </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit">Login</button>
        </div>
      </form>
    </div>
  );
}

export default Login;
