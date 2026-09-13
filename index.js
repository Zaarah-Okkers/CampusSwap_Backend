import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// home page 


// login page


// dashboards page



app.listen (2026,() => {
  console.log("Server is running on http://localhost:2026");
});