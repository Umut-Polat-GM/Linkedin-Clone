import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";

export const signup = async (req, res) => {
    const { name, username, email, password } = req.body;
    try {
        if (!name || !username || !email || !password) {
			return res.status(400).json({ message: "All fields are required" });
		}

		const existingEmail = await User.findOne({ email });
		if (existingEmail) {
			return res.status(400).json({ message: "Email already exists" });
		}

		const existingUsername = await User.findOne({ username });
		if (existingUsername) {
			return res.status(400).json({ message: "Username already exists" });
		}

		if (password.length < 6) {
			return res.status(400).json({ message: "Password must be at least 6 characters" });
		}

        const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const user = new User({
			name,
			email,
			password: hashedPassword,
			username,
		});

		await user.save()

        generateToken(user._id, res);

		res.status(201).json({ message: "User registered successfully" });

		const profileUrl = process.env.CLIENT_URL + "/profile/" + user.username;

		try {
			await sendWelcomeEmail(user.email, user.name, profileUrl);
		} catch (emailError) {
			console.error("Error sending welcome Email", emailError);
		}
    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
		const { username, password } = req.body;

		// Check if user exists
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		// Check password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

        generateToken(user._id, res);

        res.status(200).json({ message: "Logged in successfully" });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const logout = (req, res) => {
    try {
        res.clearCookie("jwt-linkedin");
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getCurrentUser = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in getCurrentUser controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
