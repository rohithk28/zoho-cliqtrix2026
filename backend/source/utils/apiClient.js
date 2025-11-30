
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://zoho-cliqtrix2026-1.onrender.com",
  timeout: 15000
});
console.log("🚀 ML BASE URL =", process.env.ML_SERVICE_URL);

export default apiClient;

