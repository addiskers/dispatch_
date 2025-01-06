import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

function ManageAccessSection({ token }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "sales" });
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await axios.get("http://localhost:5000/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }

  async function handleRegisterUser(e) {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:5000/api/auth/register",
        newUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("User registered successfully!");
      fetchUsers();
      setNewUser({ username: "", password: "", role: "sales" });
    } catch (err) {
      console.error("Error registering user:", err);
      alert("Failed to register user.");
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (!selectedUser || !newPassword) {
      alert("Select a user and enter a new password.");
      return;
    }
    try {
      await axios.patch(
        "http://localhost:5000/api/auth/update-password",
        { userId: selectedUser, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Password updated successfully!");
      setSelectedUser(null);
      setNewPassword("");
    } catch (err) {
      console.error("Error updating password:", err);
      alert("Failed to update password.");
    }
  }

  return (
    <div>
      <h2>Manage Access</h2>
      <div className="mt-4">
        <h3>Register User</h3>
        <Form onSubmit={handleRegisterUser}>
          <Form.Group>
            <Form.Control
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Control
              placeholder="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="sales">Sales</option>
              <option value="uploader">Uploader</option>
              <option value="accounts">Accounts</option>
            </Form.Select>
          </Form.Group>
          <Button type="submit" variant="primary" className="mt-2">
            Register User
          </Button>
        </Form>
      </div>
      <div className="mt-4">
        <h3>Update Password</h3>
        <Form onSubmit={handleUpdatePassword}>
          <Form.Group>
            <Form.Select
              value={selectedUser || ""}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="" disabled>
                Select User
              </option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.username} ({user.role})
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Control
              placeholder="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Form.Group>
          <Button type="submit" variant="primary" className="mt-2">
            Update Password
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default ManageAccessSection;
