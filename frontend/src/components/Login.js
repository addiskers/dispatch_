// src/components/Login.js
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

      // 2) The response should have { token, role } or something similar
      const { token } = res.data;
      // We might need to fetch the role. If the backend returns it in the response, great.
      // Otherwise, we do a "who am I" endpoint. But let's assume we have it here:
      const userRole = await fetchUserRole(token);

      // 3) Notify parent (App) that login succeeded
      onLoginSuccess(token, userRole);
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Invalid credentials or server error");
    }
  }

  // Example function to get user role from token or a separate endpoint
  async function fetchUserRole(token) {
    // If your login response doesn't contain role, you'll need another request:
    // const me = await axios.get("http://localhost:5000/api/auth/me", {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    // return me.data.role;

    // If your backend returns role in login response, just parse it:
    // e.g. if res.data.role = "sales" or "uploader"
    // For this example, let's pretend it's always "sales" or "uploader"
    
    // Hard-coding for demonstration. Replace with your real logic.
    if (username === "sales1") return "sales";
    if (username === "uploader1") return "uploader";
    return "sales"; // default fallback
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
