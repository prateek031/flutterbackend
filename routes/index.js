var express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");


const corsOptions = {
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
var router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


//Registure the user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const id = crypto.randomBytes(16).toString("hex"); 
    const hashedPassword = await bcrypt.hash(password, 16);
    const newUser = await prisma.user.create({
      data: {
        id,
        email: req.body.email,
        password: hashedPassword,
      },
    });
    res.status(201).json({ message: "User registered successfully.", user: newUser });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "An error occurred while registering the user." });
  }
});
//Middleware to check weather user is logged in or not or the sesson is expired
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; 
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided." });
  }
  jwt.verify(token, "huihuihui", (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid token." });
    }
    req.user = decoded;
    next();
  });
};

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const token = jwt.sign({ email: user.email }, "huihuihui", {
      expiresIn: "1h",
    });
    res.status(200).json({ message: "Login successful.", token ,user:user});
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "An error occurred while logging in." });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy();
  res.setHeader("Authorization", "");
  res.status(200).json({ message: "Logout successful." });
});

router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});
router.get("/feed", verifyToken, async (req, res) => {
  try {
    const { limit, page } = req.query;
    const offset = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      take: +limit,
      skip: offset,
    });

    const responseData = {
      limit: +limit,
      page: +page,
      posts,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error fetching feed data:", error);
    res.status(500).json({ error: "An error occurred while fetching feed data." });
  }
});
// router.get("/feed", verifyToken, async (req, res) => {
//   try {
//     const posts = await prisma.post.findMany();
//     res.json(posts);
//   } catch (error) {
//     console.error("Error fetching feed data:", error);
//     res.status(500).json({ error: "An error occurred while fetching feed data." });
//   }
// });
router.get("/feedo/:id",async (req, res) => {
  const postId = parseInt(req.params.id); 

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    console.error("Error fetching post details:", error);
    res.status(500).json({ error: "An error occurred while fetching post details" });
  }
});

router.post("/post", async (req, res) => {
  try {
    const newpost = await prisma.post.create({
      data: {
        title: req.body.title,
        description: req.body.description,
      },
    });
    res.status(201).json(newpost);
  } catch (error) {
    console.error("Error creating newpost:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;
