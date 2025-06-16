// client/js/market.js

// Connect to WebSocket server
const token = localStorage.getItem('token'); 

// Pass the token in the query object when establishing the socket connection
const socket = io("http://localhost:5000", { 
    query: { token: token } 
}); 
let currentPage = 1;
let totalPages = 1;
const coinsPerPage = 6;

// Get references to DOM elements
const marketListBody = document.querySelector("#market-list tbody");
const searchInput = document.getElementById("search");
const paginationControls = document.getElementById("pagination-controls");
const prevButton = document.getElementById("prev-page");
const nextButton = document.getElementById("next-page");
const pageInfoSpan = document.getElementById("page-info");
const authButton = document.getElementById('authButton'); // Get the auth button

