
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://ml:8000",
  timeout: 15000
});
console.log("🚀 ML BASE URL =", process.env.ML_SERVICE_URL);

export default apiClient;

