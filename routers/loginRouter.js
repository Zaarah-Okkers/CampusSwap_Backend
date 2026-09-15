// here will be the imports 
import express from "express";
import { register, handlelogin} from "../controller/login_con.js"


// here will be the routers 
const router = express.Router();

router.post("/login",handlelogin);
router.post("/register",register);


export default router 