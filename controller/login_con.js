// callbacks for the login page 
import {getUserByEmail, CreateUser} from "../model/login_db.js";

export const handlelogin = async (req, res) => {

  try {

    const { email, password, role } = req.body;

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.password_hash !== password) {

      return res.status(401).json({ message: "Incorrect password" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `Account is not registered as ${role}` });
    }

    const { password_hash, ...userPayload } = user;

    res.status(200).json({ message: "Login successful ;)", user: userPayload });

  } 
  
  catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// this is for the registration

export const register = async (req, res) => {

try {

const userId = await CreateUser (req.body);
res.status(201).json({ messagae: "user registered successfully", userId});
}
catch (error) {
res.status(500).json({error : error.message });
}
};