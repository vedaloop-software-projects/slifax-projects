import axios from "axios";
import Apiservices from "../helper/ApiServices";
import AsyncStorage from "@react-native-async-storage/async-storage";


export const HelperModule = () => {

    // Create a singleton Axios instance
    const instance = axios.create({
        baseURL: Apiservices.Base_URL,
        timeout: 20000,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    });

    // Attach Authorization Header Interceptor Dynamically
    instance.interceptors.request.use(
        async (config) => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error("Error retrieving token:", error);
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // GET Method
    const getMethod = async (url: string) => {
        try {
            const response = await instance.get(url);
            return response.data;
        } catch (error) {
            console.error("GET Request Error:", error);
            throw error;
        }
    };

    // POST Method
    const postMethod = async (url: string, params: any, config: any = {}) => {
        try {
            // Check if params is FormData
            const isFormData = params instanceof FormData;

            const response = await instance.post(url, params, {
                headers: {
                    "Content-Type": isFormData ? "multipart/form-data" : "application/json",
                    ...config.headers,
                },
                ...config,
            });

            return response.data;
        } catch (error: any) {
            console.error("POST Request Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    };

    return { getMethod, postMethod };

}

