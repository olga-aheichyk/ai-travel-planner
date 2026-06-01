import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import travelRoutes from "./routes/travel.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Маршруты
app.use("/api/travel", travelRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
