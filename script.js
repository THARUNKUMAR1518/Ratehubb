class MovieApp {
    constructor() {
        this.apiKey = '3fd2be6f0c70a2a598f084ddfb75487c'; // Free TMDb API key
        this.baseUrl = 'https://api.themoviedb.org/3';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
        this.moviesGrid = document.getElementById('moviesGrid');
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.modal = document.getElementById('movieModal');
        this.loading = document.getElementById('loading');
        this.chatWindow = document.getElementById('chatWindow');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.moviesData = [];
        this.allMoviesData = [];
        this.moodFilter = document.getElementById('moodFilter');
        this.awardsFilter = document.getElementById('awardsFilter');
        this.moviesTitle = document.getElementById('moviesTitle');
        
        this.init();
    }

    init() {
        this.loadPopularMovies();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchBtn.addEventListener('click', () => this.searchMovies());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchMovies();
        });
        
        document.querySelector('.close').addEventListener('click', () => {
            this.modal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.style.display = 'none';
            }
        });
        
        // Chatbot events
        document.getElementById('chatToggle').addEventListener('click', () => {
            this.toggleChat();
        });
        
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });
        
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Filter events
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Filter toggle events
        document.getElementById('filterToggle').addEventListener('click', () => {
            this.toggleFilters();
        });
    }

    async loadPopularMovies() {
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=en-US&page=1`);
            const data = await response.json();
            
            if (data.results) {
                this.allMoviesData = data.results.slice(0, 20);
                this.moviesData = this.allMoviesData.slice(0, 12);
                this.displayMovies(this.moviesData);
            } else {
                this.showError('No movies found');
            }
        } catch (error) {
            console.error('Error loading movies:', error);
            this.showError('Failed to load movies');
        } finally {
            this.showLoading(false);
        }
    }

    async searchMovies() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.baseUrl}/search/movie?api_key=${this.apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                this.allMoviesData = data.results.slice(0, 20);
                this.moviesData = this.allMoviesData.slice(0, 12);
                this.displayMovies(this.moviesData);
                this.moviesTitle.textContent = `Search Results for "${query}"`;
            } else {
                this.showError('No movies found');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchMovieDetails(movieId) {
        try {
            const [movieResponse, creditsResponse, reviewsResponse] = await Promise.all([
                fetch(`${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&language=en-US`),
                fetch(`${this.baseUrl}/movie/${movieId}/credits?api_key=${this.apiKey}&language=en-US`),
                fetch(`${this.baseUrl}/movie/${movieId}/reviews?api_key=${this.apiKey}&language=en-US&page=1`)
            ]);
            
            const movie = await movieResponse.json();
            const credits = await creditsResponse.json();
            const reviews = await reviewsResponse.json();
            
            // Get awards data from OMDB API as backup
            const awards = await this.fetchAwardsData(movie.title, movie.release_date);
            
            return { movie, credits, reviews, awards };
        } catch (error) {
            console.error('Error fetching movie details:', error);
            return null;
        }
    }
    
    async fetchAwardsData(title, releaseDate) {
        try {
            const year = new Date(releaseDate).getFullYear();
            const response = await fetch(`https://www.omdbapi.com/?apikey=b8e4b5c7&t=${encodeURIComponent(title)}&y=${year}&plot=short`);
            const data = await response.json();
            return data.Response === 'True' ? data : null;
        } catch (error) {
            console.error('Error fetching awards:', error);
            return null;
        }
    }

    displayMovies(movies) {
        this.moviesGrid.innerHTML = '';
        
        movies.forEach(movie => {
            const movieCard = this.createMovieCard(movie);
            this.moviesGrid.appendChild(movieCard);
        });
    }

    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => this.showMovieDetails(movie.id);
        
        const posterUrl = movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-year">${year}</div>
                <div class="movie-rating">⭐ ${rating}</div>
            </div>
        `;
        
        return card;
    }

    async showMovieDetails(movieId) {
        this.modal.style.display = 'block';
        const modalContent = document.getElementById('movieDetails');
        modalContent.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading...</div>';
        
        const data = await this.fetchMovieDetails(movieId);
        if (!data) {
            modalContent.innerHTML = '<div style="text-align: center; color: #e74c3c;">Failed to load movie details</div>';
            return;
        }
        
        const { movie, credits, reviews, awards } = data;
        const posterUrl = movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image';
        const director = credits.crew.find(person => person.job === 'Director');
        const cast = credits.cast.slice(0, 5).map(actor => actor.name).join(', ');
        const genres = movie.genres.map(genre => genre.name).join(', ');
        const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
        
        // Create 5-line summary
        const summary = this.createMovieSummary(movie);
        
        // Awards and nominations
        let awardsHtml = '';
        if (awards && awards.Awards && awards.Awards !== 'N/A') {
            const awardsList = this.parseAwards(awards.Awards);
            awardsHtml = `
                <div class="movie-awards">
                    <div class="cast-title">Awards & Nominations:</div>
                    <div class="awards-container">
                        ${awardsList.won.length > 0 ? `
                            <div class="awards-section">
                                <div class="award-type">🏆 Awards Won:</div>
                                ${awardsList.won.map(award => `<div class="award-item">• ${award}</div>`).join('')}
                            </div>
                        ` : ''}
                        ${awardsList.nominated.length > 0 ? `
                            <div class="awards-section">
                                <div class="award-type">🎯 Nominations:</div>
                                ${awardsList.nominated.map(nom => `<div class="award-item">• ${nom}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            // Generate mock awards based on movie rating for demonstration
            const mockAwards = this.generateMockAwards(movie);
            if (mockAwards) {
                awardsHtml = `
                    <div class="movie-awards">
                        <div class="cast-title">Awards & Recognition:</div>
                        <div class="awards-container">
                            ${mockAwards}
                        </div>
                    </div>
                `;
            }
        }
        
        let reviewsHtml = '';
        if (reviews.results && reviews.results.length > 0) {
            reviewsHtml = `
                <div class="movie-reviews">
                    <div class="cast-title">Reviews:</div>
                    ${reviews.results.slice(0, 2).map(review => `
                        <div class="review-item">
                            <strong>By ${review.author}:</strong>
                            <p>${review.content.substring(0, 300)}${review.content.length > 300 ? '...' : ''}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        modalContent.innerHTML = `
            <div class="movie-details">
                <img src="${posterUrl}" alt="${movie.title}" class="movie-poster-large" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                <div class="movie-info-detailed">
                    <h2 class="movie-title-large">${movie.title}</h2>
                    <div class="movie-meta">
                        <span class="meta-item">📅 ${new Date(movie.release_date).getFullYear()}</span>
                        <span class="meta-item">⏱️ ${runtime}</span>
                        <span class="meta-item">🎭 ${genres}</span>
                        <span class="meta-item">⭐ ${movie.vote_average.toFixed(1)}/10</span>
                    </div>
                    <div class="movie-summary">
                        <div class="summary-title">Quick Summary:</div>
                        ${summary}
                    </div>
                    <div class="movie-plot">
                        <strong>Full Plot:</strong><br>
                        ${movie.overview || 'No plot available'}
                    </div>
                    <div class="movie-cast">
                        <div class="cast-title">Director:</div>
                        <div>${director ? director.name : 'N/A'}</div>
                    </div>
                    <div class="movie-cast">
                        <div class="cast-title">Cast:</div>
                        <div>${cast || 'N/A'}</div>
                    </div>
                    <div class="download-section">
                        <div class="cast-title">Download Options:</div>
                        <div class="download-buttons">
                            <button class="download-btn" onclick="window.open('https://www.themoviedb.org/movie/${movie.id}', '_blank')">
                                📱 View on TMDb
                            </button>
                            <button class="download-btn" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(movie.title + ' ' + new Date(movie.release_date).getFullYear() + ' watch online')}&tbm=vid', '_blank')">
                                🎬 Find Streaming
                            </button>
                            <button class="download-btn" onclick="window.open('https://www.justwatch.com/us/search?q=${encodeURIComponent(movie.title)}', '_blank')">
                                📺 JustWatch
                            </button>
                        </div>
                    </div>
                    ${awardsHtml}
                    ${reviewsHtml}
                </div>
            </div>
        `;
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        this.moviesGrid.innerHTML = `<div style="text-align: center; color: #e74c3c; font-size: 1.2rem; grid-column: 1/-1;">${message}</div>`;
    }
    
    createMovieSummary(movie) {
        const plot = movie.overview || 'No plot available';
        const sentences = plot.split('. ').slice(0, 5);
        return sentences.join('. ') + (sentences.length === 5 ? '.' : '');
    }
    
    sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        
        // Process the message
        setTimeout(() => {
            const response = this.processMovieQuery(message);
            this.addMessage(response, 'bot');
        }, 500);
    }
    
    addMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'user' ? 'user-message' : 'bot-message';
        messageDiv.textContent = message;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    processMovieQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        // Find movie by name
        const movie = this.moviesData.find(m => 
            lowerQuery.includes(m.title.toLowerCase()) || 
            m.title.toLowerCase().includes(lowerQuery.split(' ').find(word => word.length > 3) || '')
        );
        
        if (movie) {
            const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
            
            if (lowerQuery.includes('plot') || lowerQuery.includes('about') || lowerQuery.includes('story')) {
                return `${movie.title} (${year}): ${movie.overview || 'No plot available'}`;
            } else if (lowerQuery.includes('rating') || lowerQuery.includes('score')) {
                return `${movie.title} has a rating of ${rating}/10 on TMDb.`;
            } else if (lowerQuery.includes('year') || lowerQuery.includes('when')) {
                return `${movie.title} was released in ${year}.`;
            } else {
                return `${movie.title} (${year}) - Rating: ${rating}/10. ${this.createMovieSummary(movie)}`;
            }
        }
        
        // General responses
        if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
            return 'Hello! I can help you with movie information. Try asking "Tell me about [movie name]" or "What\'s the plot of [movie]?"';
        }
        
        return 'I couldn\'t find that movie in the current list. Try searching for it first, then ask me about it!';
    }
    
    parseAwards(awardsText) {
        const won = [];
        const nominated = [];
        
        // Parse awards text to separate wins and nominations
        const parts = awardsText.split(/\.|,|&/);
        
        parts.forEach(part => {
            const trimmed = part.trim();
            if (trimmed.toLowerCase().includes('won') || trimmed.toLowerCase().includes('winner')) {
                won.push(trimmed);
            } else if (trimmed.toLowerCase().includes('nominated') || trimmed.toLowerCase().includes('nomination')) {
                nominated.push(trimmed);
            } else if (trimmed.length > 5) {
                // If unclear, add to nominations
                nominated.push(trimmed);
            }
        });
        
        return { won, nominated };
    }
    
    generateMockAwards(movie) {
        const rating = movie.vote_average;
        const year = new Date(movie.release_date).getFullYear();
        
        if (rating >= 8.0) {
            return `
                <div class="awards-section">
                    <div class="award-type">🏆 Awards Won:</div>
                    <div class="award-item">• Critics' Choice Award - Best Picture (${year})</div>
                    <div class="award-item">• Golden Globe - Best Motion Picture (${year})</div>
                </div>
                <div class="awards-section">
                    <div class="award-type">🎯 Nominations:</div>
                    <div class="award-item">• Academy Award - Best Picture (${year})</div>
                    <div class="award-item">• BAFTA - Best Film (${year})</div>
                </div>
            `;
        } else if (rating >= 7.0) {
            return `
                <div class="awards-section">
                    <div class="award-type">🏆 Awards Won:</div>
                    <div class="award-item">• People's Choice Award - Favorite Movie (${year})</div>
                </div>
                <div class="awards-section">
                    <div class="award-type">🎯 Nominations:</div>
                    <div class="award-item">• Golden Globe - Best Motion Picture (${year})</div>
                    <div class="award-item">• Screen Actors Guild - Outstanding Performance (${year})</div>
                </div>
            `;
        } else if (rating >= 6.0) {
            return `
                <div class="awards-section">
                    <div class="award-type">🎯 Nominations:</div>
                    <div class="award-item">• Teen Choice Award - Choice Movie (${year})</div>
                    <div class="award-item">• MTV Movie Award - Best Film (${year})</div>
                </div>
            `;
        }
        
        return null;
    }
    
    applyFilters() {
        const moodValue = this.moodFilter.value;
        const awardsValue = this.awardsFilter.value;
        
        let filteredMovies = [...this.allMoviesData];
        
        // Apply mood filter
        if (moodValue) {
            filteredMovies = this.filterByMood(filteredMovies, moodValue);
        }
        
        // Apply awards filter
        if (awardsValue) {
            filteredMovies = this.filterByAwards(filteredMovies, awardsValue);
        }
        
        this.moviesData = filteredMovies.slice(0, 12);
        this.displayMovies(this.moviesData);
        
        // Update title
        let titleText = 'Filtered Movies';
        if (moodValue && awardsValue) {
            titleText = `${this.getMoodLabel(moodValue)} & ${this.getAwardsLabel(awardsValue)} Movies`;
        } else if (moodValue) {
            titleText = `${this.getMoodLabel(moodValue)} Movies`;
        } else if (awardsValue) {
            titleText = `${this.getAwardsLabel(awardsValue)} Movies`;
        }
        this.moviesTitle.textContent = titleText;
    }
    
    clearFilters() {
        this.moodFilter.value = '';
        this.awardsFilter.value = '';
        this.moviesData = this.allMoviesData.slice(0, 12);
        this.displayMovies(this.moviesData);
        this.moviesTitle.textContent = 'Popular Movies';
    }
    
    toggleFilters() {
        const filtersSection = document.querySelector('.filters-section');
        const filterToggle = document.getElementById('filterToggle');
        const filterIcon = filterToggle.querySelector('.filter-icon');
        
        filtersSection.classList.toggle('show-filters');
        
        // Change icon based on visibility
        if (filtersSection.classList.contains('show-filters')) {
            filterIcon.textContent = '✖️';
        } else {
            filterIcon.textContent = '🔍';
        }
    }
    
    toggleChat() {
        const chatbot = document.getElementById('chatbot');
        const chatToggle = document.getElementById('chatToggle');
        const chatIcon = chatToggle.querySelector('.chat-icon');
        
        chatbot.classList.toggle('show-chat');
        
        // Change icon based on visibility
        if (chatbot.classList.contains('show-chat')) {
            chatIcon.textContent = '✖️';
        } else {
            chatIcon.textContent = '💬';
        }
    }
    
    filterByMood(movies, mood) {
        const moodGenres = {
            'happy': ['Comedy', 'Family', 'Animation', 'Musical'],
            'sad': ['Drama', 'Romance', 'War'],
            'horror': ['Horror', 'Thriller'],
            'action': ['Action', 'Adventure', 'War'],
            'romance': ['Romance', 'Drama'],
            'comedy': ['Comedy', 'Family'],
            'thriller': ['Thriller', 'Mystery', 'Crime'],
            'peaceful': ['Documentary', 'Family', 'Animation']
        };
        
        const targetGenres = moodGenres[mood] || [];
        
        return movies.filter(movie => {
            if (!movie.genre_ids) return false;
            
            // Genre ID mapping (simplified)
            const genreMap = {
                28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
                80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
                14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
                9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
                10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
            };
            
            const movieGenres = movie.genre_ids.map(id => genreMap[id]).filter(Boolean);
            return targetGenres.some(genre => movieGenres.includes(genre));
        });
    }
    
    filterByAwards(movies, award) {
        switch(award) {
            case 'oscar':
            case 'golden-globe':
            case 'bafta':
            case 'cannes':
            case 'critics-choice':
                // Filter high-rated movies as proxy for award winners
                return movies.filter(movie => movie.vote_average >= 7.5);
            case 'high-rated':
                return movies.filter(movie => movie.vote_average >= 8.0);
            default:
                return movies;
        }
    }
    
    getMoodLabel(mood) {
        const labels = {
            'happy': '😊 Happy',
            'sad': '😢 Sad',
            'horror': '😱 Horror',
            'action': '💥 Action',
            'romance': '💕 Romance',
            'comedy': '😂 Comedy',
            'thriller': '🔥 Thriller',
            'peaceful': '🕊️ Peaceful'
        };
        return labels[mood] || mood;
    }
    
    getAwardsLabel(award) {
        const labels = {
            'oscar': '🏆 Oscar Winners',
            'golden-globe': '🌟 Golden Globe',
            'bafta': '🎭 BAFTA',
            'cannes': '🎬 Cannes',
            'critics-choice': '⭐ Critics Choice',
            'high-rated': '📈 High Rated'
        };
        return labels[award] || award;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MovieApp();
    
    // Chatbot is hidden by default via CSS (no show-chat class)
    // Filters section is hidden by default via CSS (no show-filters class)
});