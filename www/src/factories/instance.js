import axios from 'axios'; 
import configs from '../constants/configs'

var instance = axios.create({
  baseURL: configs.API_BASE,
  timeout: 10000
});

module.exports = instance;