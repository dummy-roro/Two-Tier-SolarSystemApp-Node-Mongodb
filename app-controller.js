// Planet data array with correct IDs 0 to 8
const planets = [
   {
      id: 0,
      name: "Mercury",
      description: "Mercury is the smallest planet and closest to the Sun.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/mercury.png"
   },
   {
      id: 1,
      name: "Venus",
      description: "Venus has a thick atmosphere and is the hottest planet.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/venus.png"
   },
   {
      id: 2,
      name: "Earth",
      description: "Earth is the only planet known to support life.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/earth.png"
   },
   {
      id: 3,
      name: "Mars",
      description: "Mars is known as the Red Planet and has the tallest volcano.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/mars.png"
   },
   {
      id: 4,
      name: "Jupiter",
      description: "Jupiter is the largest planet and has a giant red spot.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/jupiter.png"
   },
   {
      id: 5,
      name: "Saturn",
      description: "Saturn is famous for its rings made of ice and rock.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/saturn.png"
   },
   {
      id: 6,
      name: "Uranus",
      description: "Uranus rotates on its side and is a blue-green color.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/uranus.png"
   },
   {
      id: 7,
      name: "Neptune",
      description: "Neptune is a deep blue planet and has strong winds.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/neptune.png"
   },
   {
      id: 8,
      name: "Pluto",
      description: "Pluto is a dwarf planet in the Kuiper belt.",
      imageUrl: "https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/pluto.png"
   }
];

// Function to update UI with planet info
function displayPlanet(planet) {
   document.getElementById('planetName').textContent = planet.name;
   document.getElementById('planetDescription').innerHTML = planet.description.replace(/\n/g, "<br>");
   document.getElementById('planetImage').style.backgroundImage = `url(${planet.imageUrl})`;
}

// On submit button click, get input and display planet info
document.getElementById('submit').addEventListener('click', () => {
   const input = document.getElementById('planetID').value;
   const planetID = parseInt(input);
   if (isNaN(planetID) || planetID < 0 || planetID > 8) {
      alert('Please enter a valid number between 0 and 8');
      return;
   }
   const planet = planets.find(p => p.id === planetID);
   if (planet) {
      displayPlanet(planet);
   }
});

// Initialize page with default overview on load
window.onload = () => {
   document.getElementById('planetName').textContent = "Solar System";
   document.getElementById('planetDescription').innerHTML = `Solar system consists of our star, the Sun, and everything bound to it by gravity – <br> the planets Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune; <br> dwarf planets such as Pluto; dozens of moons; and millions <br> of asteroids, comets, and meteoroids.`;
   document.getElementById('planetImage').style.backgroundImage = "url('https://gitlab.com/sidd-harth/solar-system/-/raw/main/images/solar-system.png')";
};
