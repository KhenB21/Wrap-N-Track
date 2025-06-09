const express = require("express");
const cors = require("cors");
const authRoutes = require("./Routes/auth");
const productRoutes = require("./Routes/productRoutes");
const OrderRoutes = require('./Routes/OrderRoutes');
const UserRoutes = require("./Routes/UserRoutes");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", OrderRoutes);
app.use("/api/users", UserRoutes); 


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
