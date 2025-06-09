const API_KEY = process.env.CRISP_API_KEY;
const SECRET_KEY = process.env.CRISP_SECRET_KEY;
const WEBSITE_ID = process.env.CRISP_WEBSITE_ID;
const BASE_URL = "https://api.crisp.chat/v1";
const Crisp = require("node-crisp-api"); 

const CrispClient = new Crisp();
CrispClient.authenticate(API_KEY, SECRET_KEY);

const createConversation = async () => {
    const response = await CrispClient.website.createNewConversation("dbb461f3-42ba-4046-bd39-cb50fc8f63f3");
    console.log(response);
    return response;
}


module.exports = {
    createConversation
}