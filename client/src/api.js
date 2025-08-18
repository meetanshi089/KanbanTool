// client/src/api.js
import axios from "axios";

const API_URL = "http://localhost:4000"; // adjust if backend runs elsewhere

export async function signup(name, email, password) {
  const res = await axios.post(`${API_URL}/auth/signup`, {
    name,
    email,
    password,
  });
  return res.data; // { token, user }
}

export async function login(email, password) {
  const res = await axios.post(`${API_URL}/auth/login`, { email, password });
  return res.data; // { token, user }
}
