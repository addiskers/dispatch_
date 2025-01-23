import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import "../styles/ManageAccessSection.css";

function ManageAccessSection({ token }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "sales" });
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      alert("Failed to fetch users.");
    }
  }

  async function handleRegisterUser(e) {
    e.preventDefault();
    try {
      if (!newUser.username || !newUser.email || !newUser.password) {
        alert("All fields are required!");
        return;
      }

      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/register`,
        newUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("User registered successfully!");
      fetchUsers();
      setNewUser({ username: "", email: "", password: "", role: "sales" });
    } catch (err) {
      console.error("Error registering user:", err);
      alert(err.response?.data?.message || "Failed to register user.");
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
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/update-password`,
        { userId: selectedUser, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Password updated successfully!");
      setSelectedUser(null);
      setNewPassword("");
    } catch (err) {
      console.error("Error updating password:", err);
      alert(err.response?.data?.message || "Failed to update password.");
    }
  }

  return (
    <div className="manage-access-container">
      <h2 className="section-heading">Manage Access</h2>
  
      {/* Register User Section */}
      <div className="manage-access-form">
        <h3 className="subsection-heading">Register User</h3>
        <Form onSubmit={handleRegisterUser}>
          <Form.Group className="form-group-responsive">
            <Form.Control
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="form-group-responsive">
            <Form.Control
              placeholder="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="form-group-responsive">
            <Form.Control
              placeholder="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="form-group-responsive">
            <Form.Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="sales">Sales</option>
              <option value="uploader">Uploader</option>
              <option value="accounts">Accounts</option>
            </Form.Select>
          </Form.Group>
          <Button type="submit" variant="primary" className="btn-responsive">
            Register User
          </Button>
        </Form>
      </div>
  
      {/* Update Password Section */}
      <div className="manage-access-form">
        <h3 className="subsection-heading">Update Password</h3>
        <Form onSubmit={handleUpdatePassword}>
          <Form.Group className="form-group-responsive">
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
          <Form.Group className="form-group-responsive">
            <Form.Control
              placeholder="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Form.Group>
          <Button type="submit" variant="primary" className="btn-responsive">
            Update Password
          </Button>
        </Form>
      </div>
  
      {/* Display Users Table */}
      <div className="table-responsive-wrapper">
        <h3 className="subsection-heading">Existing Users</h3>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}  
export default ManageAccessSection;
