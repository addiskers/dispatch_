import React, { useState } from "react";
import { User, Lock, LogIn } from "lucide-react";
import axios from "axios";
import "../styles/login.css";

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/login`, {
        username,
        password,
      });
      const { token, role } = res.data;
      onLoginSuccess(token, role);
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Invalid credentials or server error");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h2>Welcome Back</h2>
          <p>Please sign in to continue</p>
        </div>

        {errorMsg && (
          <div className={`error-message ${isShaking ? 'shake' : ''}`}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <User className="input-icon" size={20} />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              required
              className="login-input"
            />
            <span className="focus-border"></span>
          </div>

          <div className="form-group">
            <Lock className="input-icon" size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="login-input"
            />
            <span className="focus-border"></span>
          </div>

          <button 
            type="submit" 
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <span>Login</span>
                <LogIn size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;