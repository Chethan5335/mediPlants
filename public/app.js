// Function to toggle between login and signup pages
function toggleAuth(page) {
    if (page === 'login') {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('signupPage').classList.add('hidden');
    } else {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('signupPage').classList.remove('hidden');
    }
}

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.success) {
            // Hide login page and show main page
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('mainPage').classList.remove('hidden');
            document.getElementById('userDisplay').textContent = email.split('@')[0];
            // Load plants
            loadPlants();
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (error) {
        alert('Error during login: ' + error.message);
    }
});

// Handle signup form submission
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Signup successful! Please login.');
            toggleAuth('login');
        } else {
            alert('Signup failed: ' + data.error);
        }
    } catch (error) {
        alert('Error during signup: ' + error.message);
    }
});

let currentPage = 1;
let isLoading = false;

// Update loadPlants function
async function loadPlants(page = 1) {
    try {
        if (isLoading) return;
        isLoading = true;
        
        const response = await fetch(`/api/plants?page=${page}`);
        const data = await response.json();
        
        if (page === 1) {
            displayPlants(data.plants);
        } else {
            appendPlants(data.plants);
        }
        
        currentPage = data.meta.currentPage;
        isLoading = false;
        
        // Add infinite scroll if not last page
        if (currentPage < data.meta.totalPages) {
            observeLastPlant();
        }
    } catch (error) {
        console.error('Error loading plants:', error);
        isLoading = false;
    }
}

// Function to append plants to existing grid
function appendPlants(plants) {
    const plantsGrid = document.getElementById('plantsGrid');
    
    plants.forEach(plant => {
        const plantCard = document.createElement('div');
        plantCard.className = 'plant-card';
        plantCard.onclick = () => showPlantDetails(plant);
        
        const defaultImage = `https://via.placeholder.com/300x200?text=${encodeURIComponent(plant.name)}`;
        
        plantCard.innerHTML = `
            <div class="plant-card-image">
                <img src="${plant.image || defaultImage}" 
                     alt="${plant.name}" 
                     onerror="this.onerror=null; this.src='${defaultImage}'"
                     loading="lazy">
            </div>
            <div class="plant-card-content">
                <h3>${plant.name}</h3>
                <p>${plant.shortDescription}</p>
            </div>
        `;
        
        plantsGrid.appendChild(plantCard);
    });
}

// Infinite scroll implementation
function observeLastPlant() {
    const plantsGrid = document.getElementById('plantsGrid');
    const lastPlant = plantsGrid.lastElementChild;
    
    if (!lastPlant) return;

    const observer = new IntersectionObserver((entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && !isLoading) {
            observer.unobserve(lastEntry.target);
            loadPlants(currentPage + 1);
        }
    }, { threshold: 0.5 });

    observer.observe(lastPlant);
}

// Add loading indicator
function addLoadingIndicator() {
    const style = document.createElement('style');
    style.textContent = `
        .loading-indicator {
            text-align: center;
            padding: 20px;
            font-size: 1.2em;
            color: #666;
        }
    `;
    document.head.appendChild(style);
}

// Call this when the page loads
addLoadingIndicator();

// Function to display plants in the grid
function displayPlants(plants) {
    const plantsGrid = document.getElementById('plantsGrid');
    plantsGrid.innerHTML = '';

    plants.forEach(plant => {
        const plantCard = document.createElement('div');
        plantCard.className = 'plant-card';
        plantCard.onclick = () => showPlantDetails(plant);
        
        // Use a more descriptive placeholder image
        const defaultImage = `https://via.placeholder.com/300x200?text=${encodeURIComponent(plant.name + ' (Plant)')}`;
        const imageUrl = plant.image || defaultImage;
        
        plantCard.innerHTML = `
            <div class="plant-card-image">
                <img src="${imageUrl}" 
                     alt="${plant.name}"
                     onerror="this.onerror=null; this.src='${defaultImage}'; this.classList.add('fallback-image')"
                     loading="lazy">
            </div>
            <div class="plant-card-content">
                <h3>${plant.name}</h3>
                <p>${plant.shortDescription}</p>
            </div>
        `;
        
        plantsGrid.appendChild(plantCard);
    });
}

// Update modal functionality with better image handling
function showPlantDetails(plant) {
    const modal = document.getElementById('plantModal');
    const details = document.getElementById('plantDetails');
    
    const defaultImage = `https://via.placeholder.com/400x300?text=${encodeURIComponent(plant.name + ' (Plant)')}`;
    const imageUrl = plant.image || defaultImage;
    
    details.innerHTML = `
        <h2>${plant.name}</h2>
        <img src="${imageUrl}" 
             alt="${plant.name}" 
             class="modal-image"
             onerror="this.onerror=null; this.src='${defaultImage}'; this.classList.add('fallback-image')">
        <p class="plant-description">${plant.description}</p>
        <div class="plant-info">
            ${plant.scientific_name ? `<p><strong>Scientific Name:</strong> ${plant.scientific_name}</p>` : ''}
            ${plant.family ? `<p><strong>Family:</strong> ${plant.family}</p>` : ''}
        </div>
        <h3>Medicinal Properties:</h3>
        <ul class="properties-list">
            ${plant.medicinalProperties.map(prop => `<li>${prop}</li>`).join('')}
        </ul>
        <h3>Usage:</h3>
        <p class="usage">${plant.usage}</p>
    `;
    
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('plantModal').classList.add('hidden');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('plantModal');
    if (event.target === modal) {
        modal.classList.add('hidden');
    }
}

// Update the search functionality
function searchPlants() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const plantsGrid = document.getElementById('plantsGrid');
    
    if (!searchTerm) {
        loadPlants();
        return;
    }

    // Show loading state
    plantsGrid.innerHTML = '<div class="loading-indicator">Searching plants...</div>';

    fetch(`/api/plants/search?query=${encodeURIComponent(searchTerm)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Search request failed');
            }
            return response.json();
        })
        .then(plants => {
            if (!plants || plants.length === 0) {
                plantsGrid.innerHTML = `
                    <div class="no-results">
                        <p>No plants found matching "${searchTerm}"</p>
                        <button onclick="loadPlants()" class="btn-primary">Show all plants</button>
                    </div>`;
                return;
            }
            
            // Clear existing content
            plantsGrid.innerHTML = '';
            
            // Display each plant
            plants.forEach(plant => {
                const plantCard = document.createElement('div');
                plantCard.className = 'plant-card';
                plantCard.onclick = () => showPlantDetails(plant);
                
                const defaultImage = `https://via.placeholder.com/300x200?text=${encodeURIComponent(plant.name + ' (Plant)')}`;
                const imageUrl = plant.image || defaultImage;
                
                plantCard.innerHTML = `
                    <div class="plant-card-image">
                        <img src="${imageUrl}" 
                             alt="${plant.name}" 
                             onerror="this.onerror=null; this.src='${defaultImage}'; this.classList.add('fallback-image')"
                             loading="lazy">
                    </div>
                    <div class="plant-card-content">
                        <h3>${plant.name}</h3>
                        <p>${plant.shortDescription}</p>
                    </div>
                `;
                
                plantsGrid.appendChild(plantCard);
            });
        })
        .catch(error => {
            console.error('Error searching plants:', error);
            plantsGrid.innerHTML = `
                <div class="error-message">
                    <p>Error searching plants. Please try again.</p>
                    <button onclick="loadPlants()" class="btn-primary">Show all plants</button>
                </div>`;
        });
}

// Add event listener for search input
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchPlants();
    }
});

// Add event listener for search button click
document.getElementById('searchButton').addEventListener('click', searchPlants);

// Logout functionality
function logout() {
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}

// Update the plant identification form handler
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('plantImage');
    const resultDiv = document.getElementById('identificationResult');
    
    if (!fileInput.files[0]) {
        alert('Please select an image first');
        return;
    }

    // Show preview of uploaded image
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadedImagePreview = e.target.result;
        resultDiv.innerHTML = `
            <div class="loading-indicator">
                <img src="${uploadedImagePreview}" alt="Uploaded plant" class="uploaded-image">
                <p>Analyzing plant image...</p>
            </div>
        `;
    };
    reader.readAsDataURL(fileInput.files[0]);

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        resultDiv.classList.remove('hidden');

        const response = await fetch('/api/identify-plant', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success && data.plant) {
            resultDiv.innerHTML = `
                <div class="identification-result">
                    <h3>Plant Identified!</h3>
                    <div class="analysis-container">
                        <div class="uploaded-image-container">
                            <h4>Your Image</h4>
                            <img src="${reader.result}" alt="Uploaded plant" class="uploaded-image">
                        </div>
                    </div>
                    <div class="plant-info">
                        <div class="info-header">
                            <h4>${data.plant.name}</h4>
                            <span class="confidence-score">Confidence: ${(data.plant.probability * 100).toFixed(1)}%</span>
                        </div>
                        <p class="scientific-name"><i>${data.plant.scientificName}</i></p>
                        <p class="family">Family: ${data.plant.family}</p>
                        <p class="description">${data.plant.description}</p>
                        <div class="properties">
                            <h4>Medicinal Properties:</h4>
                            <ul>
                                ${data.plant.medicinalProperties.map(prop => `<li>${prop}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="error-message">
                    <div class="uploaded-image-container">
                        <h4>Your Image</h4>
                        <img src="${reader.result}" alt="Uploaded plant" class="uploaded-image">
                    </div>
                    <p>${data.message || 'Could not identify the plant. Please try another image.'}</p>
                    <p>Tips:</p>
                    <ul>
                        <li>Ensure the plant is well-lit and in focus</li>
                        <li>Try to capture the whole plant or distinctive features</li>
                        <li>Avoid blurry or dark images</li>
                    </ul>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <div class="uploaded-image-container">
                    <h4>Your Image</h4>
                    <img src="${reader.result}" alt="Uploaded plant" class="uploaded-image">
                </div>
                <p>Error identifying plant. Please try again.</p>
                <p>Make sure your image is:</p>
                <ul>
                    <li>Less than 10MB in size</li>
                    <li>In JPEG or PNG format</li>
                    <li>Clearly showing the plant</li>
                </ul>
            </div>
        `;
    }
}); 