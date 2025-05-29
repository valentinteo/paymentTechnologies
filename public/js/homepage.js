// const images = [
//   "/uploads/banner1.png", // First banner image
//   "/uploads/banner2.png", // Second banner image
// ];

// let currentImageIndex = 0;
// const bannerImageElement = document.getElementById("banner-image");

// // Set the initial banner image
// bannerImageElement.src = images[currentImageIndex];

// // Add click event listener for redirection
// bannerImageElement.addEventListener("click", () => {
//   if (currentImageIndex === 0) {
//     // Redirect to /productdescription/16 when banner1.png is clicked
//     window.location.href = "/productdescription/16";
//   }
// });

// setInterval(() => {
//   // Change banner image every 5 seconds
//   currentImageIndex = (currentImageIndex + 1) % images.length;
//   bannerImageElement.src = images[currentImageIndex];
// }, 5000);

// const images = [
//   "/uploads/banner1.png",
//   "/uploads/banner2.png"
// ];

// let currentImageIndex = 0;
// const bannerImageElement = document.getElementById("banner-image");

// // Set the initial banner image
// bannerImageElement.src = images[currentImageIndex];

// // Add event listener for click redirection
// bannerImageElement.addEventListener("click", () => {
//   if (currentImageIndex === 0) {
//       window.location.href = "/productdescription/16";
//   }
// });

// // Function to change banner manually
// function changeBanner(direction) {
//   if (direction === "next") {
//       currentImageIndex = (currentImageIndex + 1) % images.length;
//   } else if (direction === "prev") {
//       currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
//   }
//   bannerImageElement.src = images[currentImageIndex];
// }

// // Add buttons for manual navigation
// const bannerContainer = document.getElementById("banner-container");
// const prevButton = document.createElement("button");
// const nextButton = document.createElement("button");

// prevButton.textContent = "❮";
// nextButton.textContent = "❯";

// prevButton.classList.add("banner-btn", "prev-btn");
// nextButton.classList.add("banner-btn", "next-btn");

// prevButton.onclick = () => changeBanner("prev");
// nextButton.onclick = () => changeBanner("next");

// bannerContainer.appendChild(prevButton);
// bannerContainer.appendChild(nextButton);

// // Auto change banner every 5 seconds
// setInterval(() => changeBanner("next"), 5000);



const images = [
  "/uploads/banner1.png",
  "/uploads/banner2.png"
];

let currentImageIndex = 0;
const bannerImageElement = document.getElementById("banner-image");

// Apply CSS for smooth transition
bannerImageElement.style.transition = "opacity 0.5s ease-in-out";

// Function to change banner with fade effect
function changeBanner(direction) {
  bannerImageElement.style.opacity = 0; // Fade out
  setTimeout(() => {
    if (direction === "next") {
      currentImageIndex = (currentImageIndex + 1) % images.length;
    } else if (direction === "prev") {
      currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    }
    bannerImageElement.src = images[currentImageIndex];
    bannerImageElement.style.opacity = 1; // Fade in
  }, 500); // Match transition duration
}


// Add event listener for click redirection
bannerImageElement.addEventListener("click", () => {
  if (currentImageIndex === 0) {
      window.location.href = "/productdescription/16";
  }
});

// Add buttons for manual navigation
const bannerContainer = document.getElementById("banner-container");
const prevButton = document.createElement("button");
const nextButton = document.createElement("button");

prevButton.textContent = "❮";
nextButton.textContent = "❯";

prevButton.classList.add("banner-btn", "prev-btn");
nextButton.classList.add("banner-btn", "next-btn");

prevButton.onclick = () => changeBanner("prev");
nextButton.onclick = () => changeBanner("next");

bannerContainer.appendChild(prevButton);
bannerContainer.appendChild(nextButton);

// Auto change banner every 5 seconds
setInterval(() => changeBanner("next"), 5000);



