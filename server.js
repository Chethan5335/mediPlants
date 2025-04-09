const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
require('dotenv').config();

const app = express();

// Import models
const User = require('./models/User');
const Plant = require('./models/Plant');

// Import the local plant data
const localPlants = require('./data/plantData');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple Auth Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Plant Routes with Trefle API
app.get('/api/plants', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const perPage = 20;

        if (!process.env.TREFLE_API_TOKEN) {
            console.warn('Trefle API token not found, using local data');
            return res.json({
                plants: localPlants,
                meta: {
                    currentPage: 1,
                    totalPages: 1,
                    total: localPlants.length
                }
            });
        }

        try {
            const response = await fetch(
                `https://trefle.io/api/v1/plants?page=${page}&per_page=${perPage}&filter[edible]=true&filter_not[image_url]=null`, {
                headers: {
                    'Authorization': `Bearer ${process.env.TREFLE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Trefle API responded with status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.data) {
                const plants = data.data.map(plant => ({
                    id: plant.id,
                    name: plant.common_name || plant.scientific_name,
                    image: plant.image_url,
                    shortDescription: `${plant.family_common_name || 'Medicinal plant'} with various health benefits`,
                    description: plant.description || `A species of ${plant.family_common_name || 'plant'} with potential medicinal properties.`,
                    medicinalProperties: [
                        plant.family_common_name || "Traditional medicine",
                        plant.edible_part ? `Edible part: ${plant.edible_part}` : null,
                        plant.observations || "Natural remedy",
                        "Consult professionals for specific uses"
                    ].filter(Boolean),
                    usage: plant.uses || "Consult with a healthcare professional for specific usage guidelines"
                }));

                return res.json({
                    plants,
                    meta: {
                        currentPage: data.meta.current_page,
                        totalPages: data.meta.total_pages,
                        total: data.meta.total
                    }
                });
            }
        } catch (error) {
            console.error('Trefle API error:', error);
            // Fall through to local data
        }

        // Return local data as fallback
        console.warn('Falling back to local data');
        res.json({
            plants: localPlants,
            meta: {
                currentPage: 1,
                totalPages: 1,
                total: localPlants.length
            }
        });

    } catch (error) {
        console.error('Error fetching plants:', error);
        res.status(500).json({ error: 'Failed to fetch plants' });
    }
});

app.get('/api/plants/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.json([]);
        }

        if (!process.env.PERENUAL_API_KEY) {
            console.warn('Perenual API key not found, using local search');
            return res.json(localPlants.filter(plant => 
                plant.name.toLowerCase().includes(query.toLowerCase()) ||
                plant.description.toLowerCase().includes(query.toLowerCase())
            ));
        }

        try {
            // Search using Perenual API
            const response = await fetch(
                `https://perenual.com/api/species-list?key=${process.env.PERENUAL_API_KEY}&q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Perenual API responded with status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const plants = data.data
                    .filter(plant => {
                        // Check if any image URL is available
                        const hasImage = plant.default_image && (
                            plant.default_image.original_url ||
                            plant.default_image.regular_url ||
                            plant.default_image.small_url ||
                            plant.default_image.thumbnail
                        );
                        return hasImage;
                    })
                    .map(plant => {
                        // Get the best available image URL
                        const imageUrl = plant.default_image.regular_url ||
                                       plant.default_image.original_url ||
                                       plant.default_image.small_url ||
                                       plant.default_image.thumbnail;

                        return {
                            id: plant.id,
                            name: plant.common_name || plant.scientific_name[0],
                            scientific_name: plant.scientific_name[0],
                            family: plant.family,
                            image: imageUrl,
                            shortDescription: `${plant.family || 'Plant'} family plant with potential medicinal properties`,
                            description: `${plant.common_name || plant.scientific_name[0]} (${plant.scientific_name[0]}) is a species from the ${plant.family || 'plant'} family.`,
                            medicinalProperties: [
                                plant.family ? `Family: ${plant.family}` : null,
                                plant.common_name ? `Also known as: ${plant.common_name}` : null,
                                plant.cycle ? `Life cycle: ${plant.cycle}` : null,
                                plant.watering ? `Watering needs: ${plant.watering}` : null,
                                "Consult healthcare professionals for medicinal use",
                                "Verify plant identification before use"
                            ].filter(Boolean),
                            usage: "Consult with a healthcare professional for specific usage guidelines"
                        };
                    });

                if (plants.length > 0) {
                    return res.json(plants);
                }
            }
            
            // If no results from Perenual, fall through to local search
            throw new Error('No valid results from Perenual API');
            
        } catch (error) {
            console.error('Perenual API error:', error);
            // Fall through to local search
        }

        // Fallback to local search
        console.warn('Falling back to local search');
        const searchResults = localPlants.filter(plant => 
            plant.name.toLowerCase().includes(query.toLowerCase()) ||
            plant.description.toLowerCase().includes(query.toLowerCase()) ||
            plant.medicinalProperties.some(prop => 
                prop.toLowerCase().includes(query.toLowerCase())
            )
        );

        res.json(searchResults);

    } catch (error) {
        console.error('Error searching plants:', error);
        res.status(500).json({ 
            error: 'Failed to search plants. Please try again.',
            details: error.message 
        });
    }
});

// Add this route to test the API connection
app.get('/api/test-trefle', async (req, res) => {
    try {
        if (!process.env.TREFLE_API_TOKEN) {
            return res.status(500).json({ error: 'Trefle API token is not configured' });
        }

        const response = await fetch(
            'https://trefle.io/api/v1/plants', {
            headers: {
                'Authorization': `Bearer ${process.env.TREFLE_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Trefle API responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.json({
            success: true,
            message: 'Successfully connected to Trefle API',
            data: data
        });
    } catch (error) {
        console.error('Error testing Trefle API:', error);
        res.status(500).json({ 
            error: 'Failed to connect to Trefle API',
            details: error.message,
            tip: 'Please verify your TREFLE_API_TOKEN in the .env file'
        });
    }
});

// Add this to your server.js
const upload = multer({ storage: multer.memoryStorage() });

// Plant identification endpoint
app.post('/api/identify-plant', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Create form data
        const formData = new FormData();
        
        // Append the buffer directly with a filename
        formData.append('images', req.file.buffer, {
            filename: 'plant.jpg',
            contentType: req.file.mimetype
        });

        // Make the API request
        const response = await fetch(
            `https://my-api.plantnet.org/v2/identify/all?api-key=${process.env.PLANTNET_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('API Response:', data);

        if (data.results && data.results.length > 0) {
            const bestMatch = data.results[0];
            res.json({
                success: true,
                plant: {
                    name: bestMatch.species.commonNames?.[0] || bestMatch.species.scientificNameWithoutAuthor,
                    scientificName: bestMatch.species.scientificNameWithoutAuthor,
                    probability: bestMatch.score,
                    family: bestMatch.species.family.scientificNameWithoutAuthor,
                    image: bestMatch.images?.[0]?.url?.m,
                    description: `A member of the ${bestMatch.species.family.scientificNameWithoutAuthor} family`,
                    medicinalProperties: [
                        "Traditional medicinal uses may include:",
                        `${bestMatch.species.commonNames?.[0] || 'This plant'} properties`,
                        "Always consult healthcare professionals",
                        "Verify plant identification before use"
                    ]
                }
            });
        } else {
            res.json({
                success: false,
                message: data.message || 'Could not identify the plant with sufficient confidence'
            });
        }
    } catch (error) {
        console.error('Error identifying plant:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to identify plant. Please try again.' 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});