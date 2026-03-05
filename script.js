class MovieApp {
    constructor() {
        this.apiKey = '3fd2be6f0c70a2a598f084ddfb75487c'; // Free TMDb API key
        // Use serverless function on Vercel, CORS proxy for local development
        this.baseUrl = window.location.hostname.includes('vercel.app')
            ? '/api/tmdb'
            : 'https://corsproxy.io/?https://api.themoviedb.org/3';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
        this.moviesGrid = document.getElementById('moviesGrid');
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.modal = document.getElementById('movieModal');
        this.loading = document.getElementById('loading');
        this.loadMoreBtn = document.getElementById('loadMoreBtn');
        this.resultsCount = document.getElementById('resultsCount');
        this.genreFilter = document.getElementById('genreFilter');
        this.sortSelect = document.getElementById('sortSelect');
        this.yearFrom = document.getElementById('yearFrom');
        this.yearTo = document.getElementById('yearTo');
        this.chatWindow = document.getElementById('chatWindow');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.moviesData = [];
        this.allMoviesData = [];
        this.currentMoviesData = [];
        this.genreMap = {};
        this.currentPage = 1;
        this.currentView = 'popular';
        this.currentQuery = '';
        this.displayLimit = 12;
        this.moodFilter = document.getElementById('moodFilter');
        this.awardsFilter = document.getElementById('awardsFilter');
        this.moviesTitle = document.getElementById('moviesTitle');

        this.init();
    }

    init() {
        this.loadGenres();
        this.loadView('popular');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchBtn.addEventListener('click', () => this.searchMovies());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchMovies();
        });

        this.loadMoreBtn.addEventListener('click', () => this.loadMore());
        this.sortSelect.addEventListener('change', () => this.applyFiltersAndRender());
        this.genreFilter.addEventListener('change', () => this.applyFiltersAndRender());
        this.yearFrom.addEventListener('input', () => this.applyFiltersAndRender());
        this.yearTo.addEventListener('input', () => this.applyFiltersAndRender());

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
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
            this.applyFiltersAndRender();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Filter toggle events
        document.getElementById('filterToggle').addEventListener('click', () => {
            this.toggleFilters();
        });
    }

    async loadGenres() {
        try {
            const response = await fetch(`${this.baseUrl}/genre/movie/list?api_key=${this.apiKey}&language=en-US`);
            const data = await response.json();
            if (data.genres) {
                data.genres.forEach(genre => {
                    this.genreMap[genre.id] = genre.name;
                });
                this.genreFilter.innerHTML = '<option value="">All Genres</option>' +
                    data.genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading genres:', error);
        }
    }

    async loadView(view, page = 1, append = false) {
        this.showLoading(true);
        this.currentView = view;
        this.currentPage = page;

        try {
            let endpoint = '';
            let title = '';
            if (view === 'search') {
                endpoint = `/search/movie?api_key=${this.apiKey}&language=en-US&query=${encodeURIComponent(this.currentQuery)}&page=${page}`;
                title = `Search Results for "${this.currentQuery}"`;
            } else if (view === 'watchlist') {
                this.renderWatchlist();
                this.showLoading(false);
                return;
            } else if (view === 'top_10_week') {
                const today = new Date();
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const dateFrom = weekAgo.toISOString().split('T')[0];
                const dateTo = today.toISOString().split('T')[0];
                endpoint = `/discover/movie?api_key=${this.apiKey}&language=en-US&sort_by=vote_average.desc&primary_release_date.gte=${dateFrom}&primary_release_date.lte=${dateTo}&vote_count.gte=100&page=1`;
                title = this.getViewTitle(view);
            } else {
                endpoint = `/movie/${view}?api_key=${this.apiKey}&language=en-US&page=${page}`;
                title = this.getViewTitle(view);
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`);
            const data = await response.json();

            if (data.results) {
                if (append) {
                    this.currentMoviesData = this.currentMoviesData.concat(data.results);
                } else {
                    this.currentMoviesData = data.results;
                    this.displayLimit = 12;
                }
                if (view === 'top_10_week') {
                    this.currentMoviesData = this.currentMoviesData.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 10);
                }
                this.allMoviesData = [...this.currentMoviesData];
                this.moviesTitle.textContent = title;
                this.applyFiltersAndRender();
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

        this.currentQuery = query;
        this.switchView('search');
    }

    switchView(view) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.loadView(view, 1, false);
    }

    loadMore() {
        if (this.currentView === 'watchlist') return;
        this.currentPage += 1;
        this.displayLimit += 12;
        this.loadView(this.currentView, this.currentPage, true);
    }

    getViewTitle(view) {
        const titles = {
            popular: 'Popular Movies',
            top_rated: 'Top Rated Movies',
            now_playing: 'Now Playing',
            upcoming: 'Upcoming Movies',
            top_10_week: 'Top 10 This Week',
            search: 'Search Results',
            watchlist: 'Your Watchlist'
        };
        return titles[view] || 'Movies';
    }

    async applyFiltersAndRender() {
        let filteredMovies = [...this.currentMoviesData];

        const moodValue = this.moodFilter.value;
        const awardsValue = this.awardsFilter.value;
        const genreValue = this.genreFilter.value;
        const yearFrom = parseInt(this.yearFrom.value || '0', 10);
        const yearTo = parseInt(this.yearTo.value || '0', 10);

        if (moodValue) {
            filteredMovies = this.filterByMood(filteredMovies, moodValue);
        }

        if (awardsValue) {
            filteredMovies = this.filterByAwards(filteredMovies, awardsValue);
        }

        if (genreValue) {
            filteredMovies = filteredMovies.filter(movie => movie.genre_ids && movie.genre_ids.includes(parseInt(genreValue)));
        }

        if (yearFrom || yearTo) {
            filteredMovies = filteredMovies.filter(movie => {
                const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
                if (yearFrom && year < yearFrom) return false;
                if (yearTo && year > yearTo) return false;
                return true;
            });
        }


        filteredMovies = this.sortMovies(filteredMovies, this.sortSelect.value);

        this.moviesData = filteredMovies.slice(0, this.displayLimit);
        this.displayMovies(this.moviesData);
        this.updateResultsCount(filteredMovies.length);
        this.toggleLoadMore(filteredMovies.length > this.displayLimit);
    }


    sortMovies(movies, sortValue) {
        const sorted = [...movies];
        switch (sortValue) {
            case 'rating.desc':
                return sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            case 'rating.asc':
                return sorted.sort((a, b) => (a.vote_average || 0) - (b.vote_average || 0));
            case 'year.desc':
                return sorted.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
            case 'year.asc':
                return sorted.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
            case 'title.asc':
                return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            case 'title.desc':
                return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            default:
                return sorted;
        }
    }

    updateResultsCount(count) {
        this.resultsCount.textContent = `${count} result${count === 1 ? '' : 's'}`;
    }

    toggleLoadMore(show) {
        this.loadMoreBtn.style.display = show ? 'inline-flex' : 'none';
    }

    renderWatchlist() {
        const watchlistData = this.getWatchlistData();
        this.currentMoviesData = Object.values(watchlistData);
        this.allMoviesData = [...this.currentMoviesData];
        this.moviesTitle.textContent = this.getViewTitle('watchlist');
        this.displayLimit = 999;
        this.applyFiltersAndRender();
    }

    async fetchMovieDetails(movieId) {
        try {
            const [movieResponse, creditsResponse, reviewsResponse, videosResponse, similarResponse, providersResponse, releasesResponse] = await Promise.all([
                fetch(`${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&language=en-US`),
                fetch(`${this.baseUrl}/movie/${movieId}/credits?api_key=${this.apiKey}&language=en-US`),
                fetch(`${this.baseUrl}/movie/${movieId}/reviews?api_key=${this.apiKey}&language=en-US&page=1`),
                fetch(`${this.baseUrl}/movie/${movieId}/videos?api_key=${this.apiKey}&language=en-US`),
                fetch(`${this.baseUrl}/movie/${movieId}/similar?api_key=${this.apiKey}&language=en-US&page=1`),
                fetch(`${this.baseUrl}/movie/${movieId}/watch/providers?api_key=${this.apiKey}`),
                fetch(`${this.baseUrl}/movie/${movieId}/release_dates?api_key=${this.apiKey}`)
            ]);

            const movie = await movieResponse.json();
            const credits = await creditsResponse.json();
            const reviews = await reviewsResponse.json();
            const videos = await videosResponse.json();
            const similar = await similarResponse.json();
            const providers = await providersResponse.json();
            const releases = await releasesResponse.json();

            // Get awards data from OMDB API as backup
            const awards = await this.fetchAwardsData(movie.title, movie.release_date);

            return { movie, credits, reviews, awards, videos, similar, providers, releases };
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
        if (!movies || movies.length === 0) {
            this.showError('No movies match your filters');
            this.toggleLoadMore(false);
            return;
        }

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
        const stars = this.renderStars(movie.vote_average);
        const isWatchlisted = this.isInWatchlist(movie.id);

        card.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-year">${year}</div>
                <div class="movie-rating">⭐ ${rating}</div>
                <div class="movie-actions">
                    <div class="star-rating" aria-label="${rating} out of 10">
                        ${stars}
                    </div>
                    <button class="watchlist-btn ${isWatchlisted ? 'active' : ''}" data-id="${movie.id}">
                        ${isWatchlisted ? '❤️ Saved' : '🤍 Watchlist'}
                    </button>
                </div>
            </div>
        `;

        const watchlistBtn = card.querySelector('.watchlist-btn');
        watchlistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleWatchlist(movie);
            watchlistBtn.classList.toggle('active', this.isInWatchlist(movie.id));
            watchlistBtn.textContent = this.isInWatchlist(movie.id) ? '❤️ Saved' : '🤍 Watchlist';
        });

        return card;
    }

    renderStars(voteAverage) {
        const ratingOutOfFive = Math.round(((voteAverage || 0) / 10) * 5 * 2) / 2;
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (ratingOutOfFive >= i) {
                starsHtml += '<span class="star">★</span>';
            } else {
                starsHtml += '<span class="star empty">★</span>';
            }
        }
        return starsHtml;
    }

    getWatchlist() {
        const stored = localStorage.getItem('ratehub_watchlist');
        return stored ? JSON.parse(stored) : [];
    }

    getWatchlistData() {
        const stored = localStorage.getItem('ratehub_watchlist_data');
        return stored ? JSON.parse(stored) : {};
    }

    isInWatchlist(movieId) {
        return this.getWatchlist().includes(movieId);
    }

    toggleWatchlist(movie) {
        const list = this.getWatchlist();
        const data = this.getWatchlistData();
        const idx = list.indexOf(movie.id);
        if (idx >= 0) {
            list.splice(idx, 1);
            delete data[movie.id];
        } else {
            list.push(movie.id);
            data[movie.id] = movie;
        }
        localStorage.setItem('ratehub_watchlist', JSON.stringify(list));
        localStorage.setItem('ratehub_watchlist_data', JSON.stringify(data));

        if (this.currentView === 'watchlist') {
            this.renderWatchlist();
        }
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

        const { movie, credits, reviews, awards, videos, similar, providers, releases } = data;
        const posterUrl = movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image';
        const director = credits.crew.find(person => person.job === 'Director');
        const cast = credits.cast.slice(0, 5).map(actor => actor.name).join(', ');
        const genres = movie.genres.map(genre => genre.name).join(', ');
        const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
        const budget = movie.budget ? this.formatCurrency(movie.budget) : 'N/A';
        const revenue = movie.revenue ? this.formatCurrency(movie.revenue) : 'N/A';
        const languages = movie.spoken_languages && movie.spoken_languages.length > 0 ? movie.spoken_languages : [];
        const originalLanguage = movie.original_language ? this.getLanguageName(movie.original_language) : 'Unknown';
        const certification = this.getCertification(releases);
        const ratingPercent = Math.round(((movie.vote_average || 0) / 10) * 100);
        const userRating = this.getUserRating(movie.id);

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

        const trailerKey = videos && videos.results ? (videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos.results.find(v => v.site === 'YouTube')) : null;
        const trailerHtml = trailerKey ? `
            <div class="trailer-section">
                <div class="cast-title">Official Trailer:</div>
                <iframe class="trailer-frame" src="https://www.youtube.com/embed/${trailerKey.key}" allowfullscreen></iframe>
            </div>
        ` : '';

        const similarMovies = similar && similar.results ? similar.results.slice(0, 8) : [];
        const similarHtml = similarMovies.length > 0 ? `
            <div class="similar-movies">
                <div class="cast-title">Similar Movies:</div>
                <div class="similar-grid">
                    ${similarMovies.map(item => {
            const img = item.poster_path ? `${this.imageBaseUrl}${item.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image';
            return `
                            <div class="similar-card" data-id="${item.id}">
                                <img src="${img}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
                                <div class="similar-title">${item.title}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        ` : '';

        const userReviews = this.getUserReviews(movie.id);
        const userReviewsHtml = userReviews.length > 0 ? `
            <div class="movie-reviews">
                <div class="cast-title">Your Reviews:</div>
                ${userReviews.map(review => `
                    <div class="review-item">
                        <strong>${review.rating}/10</strong>
                        <p>${review.text}</p>
                    </div>
                `).join('')}
            </div>
        ` : '';

        const castGrid = credits.cast.slice(0, 8).map(actor => {
            const photo = actor.profile_path ? `${this.imageBaseUrl}${actor.profile_path}` : 'https://via.placeholder.com/200x300?text=No+Image';
            return `
                <div class="cast-card">
                    <img src="${photo}" alt="${actor.name}" onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
                    <div class="cast-name">${actor.name}</div>
                </div>
            `;
        }).join('');

        const languagesHtml = languages.length > 0 ? `
            <div class="languages-section">
                <div class="cast-title">Available Languages:</div>
                <div class="language-tags">
                    <div class="language-tag"><strong>Original:</strong> ${originalLanguage}</div>
                    ${languages.slice(0, 8).map(lang => `
                        <div class="language-tag">${lang.english_name || lang.name || 'Unknown'}</div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const providerData = providers && providers.results ? (providers.results.US || providers.results.IN || providers.results.GB || providers.results.CA || Object.values(providers.results)[0]) : null;
        const providerList = providerData && (providerData.flatrate || providerData.rent || providerData.buy) ? (providerData.flatrate || providerData.rent || providerData.buy) : [];
        const providerTitle = providerData && providerData.flatrate ? 'Available on OTT' : (providerData && providerData.rent ? 'Available to Rent' : (providerData && providerData.buy ? 'Available to Buy' : 'Available on OTT'));
        const providersHtml = providerList.length > 0 ? `
            <div class="ott-section">
                <div class="cast-title">${providerTitle}:</div>
                <div class="ott-logos">
                    ${providerList.slice(0, 6).map(p => `
                        <div class="ott-logo">
                            <img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="ott-section">
                <div class="cast-title">Available on OTT:</div>
                <div>No OTT info available.</div>
            </div>
        `;

        modalContent.innerHTML = `
            <div class="movie-details">
                <img src="${posterUrl}" alt="${movie.title}" class="movie-poster-large" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                <div class="movie-info-detailed">
                    <div class="title-with-rating">
                        <h2 class="movie-title-large">${movie.title}</h2>
                        ${certification ? `<span class="age-rating-badge">${certification}</span>` : ''}
                    </div>
                    <div class="movie-meta">
                        <span class="meta-item">📅 ${new Date(movie.release_date).getFullYear()}</span>
                        <span class="meta-item">⏱️ ${runtime}</span>
                        <span class="meta-item">🎭 ${genres}</span>
                        <span class="meta-item">⭐ ${movie.vote_average.toFixed(1)}/10</span>
                        <span class="meta-item">👥 ${movie.vote_count} votes</span>
                        <span class="meta-item">💰 Budget: ${budget}</span>
                        <span class="meta-item">📦 Box Office: ${revenue}</span>
                    </div>
                    <button class="overview-btn" id="overviewBtn-${movie.id}" data-revenue="${movie.revenue || 0}">Overview: Country Collection</button>
                    <div id="collectionGraph-${movie.id}" class="collection-graph" style="display:none;"></div>
                    ${providersHtml}
                    ${languagesHtml}
                    <div class="rating-meter">
                        <strong>IMDb-style Rating Meter</strong>
                        <div class="meter-bar">
                            <div class="meter-fill" style="width: ${ratingPercent}%;"></div>
                        </div>
                        <div class="user-rating" data-movie-id="${movie.id}">
                            <span>Your Rating:</span>
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => `
                                <button class="star-btn ${userRating >= value ? 'active' : ''}" data-rating="${value}">★</button>
                            `).join('')}
                            <span>${userRating ? userRating + '/10' : 'Not rated'}</span>
                        </div>
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
                        <div class="cast-grid">${castGrid}</div>
                    </div>
                    ${awardsHtml}
                    ${reviewsHtml}
                    ${userReviewsHtml}
                    ${trailerHtml}
                    ${similarHtml}
                    <div class="review-form">
                        <div class="cast-title">Add Your Review:</div>
                        <textarea id="userReviewText-${movie.id}" placeholder="Share your thoughts..."></textarea>
                        <button id="submitReviewBtn-${movie.id}">Submit Review</button>
                    </div>
                </div>
            </div>
        `;

        this.attachModalInteractions(movie.id);
    }

    attachModalInteractions(movieId) {
        const ratingContainer = document.querySelector(`.user-rating[data-movie-id="${movieId}"]`);
        if (ratingContainer) {
            ratingContainer.querySelectorAll('.star-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const rating = parseInt(btn.dataset.rating, 10);
                    this.setUserRating(movieId, rating);
                    ratingContainer.querySelectorAll('.star-btn').forEach(star => {
                        star.classList.toggle('active', parseInt(star.dataset.rating, 10) <= rating);
                    });
                    ratingContainer.querySelector('span:last-child').textContent = `${rating}/10`;
                });
            });
        }

        const reviewBtn = document.getElementById(`submitReviewBtn-${movieId}`);
        if (reviewBtn) {
            reviewBtn.addEventListener('click', () => {
                const textArea = document.getElementById(`userReviewText-${movieId}`);
                const text = textArea.value.trim();
                const rating = this.getUserRating(movieId) || 0;
                if (!text) return;
                this.addUserReview(movieId, { text, rating });
                textArea.value = '';
                this.showMovieDetails(movieId);
            });
        }

        document.querySelectorAll('.similar-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id, 10);
                if (id) {
                    this.showMovieDetails(id);
                }
            });
        });

        const overviewBtn = document.getElementById(`overviewBtn-${movieId}`);
        const graph = document.getElementById(`collectionGraph-${movieId}`);
        if (overviewBtn && graph) {
            overviewBtn.addEventListener('click', () => {
                graph.style.display = graph.style.display === 'none' ? 'block' : 'none';
                if (graph.innerHTML.trim() === '') {
                    const revenue = parseInt(overviewBtn.dataset.revenue || '0', 10);
                    graph.innerHTML = this.buildCollectionGraph(revenue);
                }
            });
        }
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        this.moviesGrid.innerHTML = `<div style="text-align: center; color: #e74c3c; font-size: 1.2rem; grid-column: 1/-1;">${message}</div>`;
        this.updateResultsCount(0);
        this.toggleLoadMore(false);
    }

    createMovieSummary(movie) {
        const plot = movie.overview || 'No plot available';
        const sentences = plot.split('. ').slice(0, 5);
        return sentences.join('. ') + (sentences.length === 5 ? '.' : '');
    }

    getUserRating(movieId) {
        const stored = localStorage.getItem('ratehub_user_ratings');
        const ratings = stored ? JSON.parse(stored) : {};
        return ratings[movieId] || 0;
    }

    setUserRating(movieId, rating) {
        const stored = localStorage.getItem('ratehub_user_ratings');
        const ratings = stored ? JSON.parse(stored) : {};
        ratings[movieId] = rating;
        localStorage.setItem('ratehub_user_ratings', JSON.stringify(ratings));
    }

    getUserReviews(movieId) {
        const stored = localStorage.getItem('ratehub_user_reviews');
        const reviews = stored ? JSON.parse(stored) : {};
        return reviews[movieId] || [];
    }

    addUserReview(movieId, review) {
        const stored = localStorage.getItem('ratehub_user_reviews');
        const reviews = stored ? JSON.parse(stored) : {};
        if (!reviews[movieId]) {
            reviews[movieId] = [];
        }
        reviews[movieId].unshift({
            text: review.text,
            rating: review.rating || 0,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('ratehub_user_reviews', JSON.stringify(reviews));
    }

    buildCollectionGraph(revenue) {
        if (!revenue) {
            return '<div>No country collection data available.</div>';
        }
        const countries = [
            { name: 'USA', share: 0.45 },
            { name: 'UK', share: 0.10 },
            { name: 'India', share: 0.15 },
            { name: 'China', share: 0.18 },
            { name: 'Other', share: 0.12 }
        ];
        return countries.map(c => {
            const amount = revenue * c.share;
            const percent = Math.round(c.share * 100);
            return `
                <div class="graph-row">
                    <div>${c.name}</div>
                    <div class="graph-bar"><div class="graph-fill" style="width:${percent}%;"></div></div>
                    <div>${this.formatCurrency(amount)}</div>
                </div>
            `;
        }).join('');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    }

    getLanguageName(code) {
        const languageMap = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'hi': 'Hindi',
            'ta': 'Tamil',
            'te': 'Telugu',
            'ka': 'Kannada',
            'ml': 'Malayalam',
            'bn': 'Bengali',
            'pa': 'Punjabi',
            'ko': 'Korean',
            'ar': 'Arabic',
            'tr': 'Turkish',
            'pl': 'Polish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'no': 'Norwegian',
            'da': 'Danish',
            'fi': 'Finnish',
            'el': 'Greek',
            'th': 'Thai',
            'vi': 'Vietnamese'
        };
        return languageMap[code] || code.toUpperCase();
    }

    getCertification(releases) {
        if (!releases || !releases.results || releases.results.length === 0) {
            return null;
        }

        const usRelease = releases.results.find(r => r.iso_3166_1 === 'US' || r.iso_3166_1 === 'IN');
        if (usRelease && usRelease.release_dates && usRelease.release_dates.length > 0) {
            const certification = usRelease.release_dates[0].certification;
            return certification ? certification : null;
        }

        const firstRelease = releases.results.find(r => r.release_dates && r.release_dates.length > 0);
        if (firstRelease && firstRelease.release_dates && firstRelease.release_dates[0].certification) {
            return firstRelease.release_dates[0].certification;
        }

        return null;
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.chatInput.value = '';

        const response = await this.processMovieQuery(message);
        this.addMessage(response, 'bot');
    }

    addMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'user' ? 'user-message' : 'bot-message';
        messageDiv.textContent = message;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    async processMovieQuery(query) {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
            return 'Hi! Ask a question about a movie, like: plot, cast, reviews, awards, rating, runtime, or trailer.';
        }

        const movie = await this.findMovieFromQuery(query);
        if (!movie) {
            return 'I could not find that movie. Try using the exact movie name.';
        }

        const details = await this.fetchMovieDetails(movie.id);
        if (!details) {
            return 'Sorry, I could not load movie details right now.';
        }

        const { movie: full, credits, reviews, awards, videos, similar } = details;
        const year = full.release_date ? new Date(full.release_date).getFullYear() : 'N/A';
        const rating = full.vote_average ? full.vote_average.toFixed(1) : 'N/A';
        const runtime = full.runtime ? `${full.runtime} min` : 'N/A';
        const genres = full.genres && full.genres.length ? full.genres.map(g => g.name).join(', ') : 'N/A';
        const director = credits.crew.find(person => person.job === 'Director');
        const cast = credits.cast.slice(0, 6).map(actor => actor.name).join(', ') || 'N/A';
        const trailer = videos && videos.results ? videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') : null;
        const similarTitles = similar && similar.results ? similar.results.slice(0, 5).map(m => m.title).join(', ') : 'N/A';
        const awardsText = awards && awards.Awards && awards.Awards !== 'N/A' ? awards.Awards : 'No awards information available.';

        if (this.includesAny(lowerQuery, ['plot', 'story', 'about', 'summary'])) {
            return `${full.title} (${year}): ${full.overview || 'No plot available.'}`;
        }
        if (this.includesAny(lowerQuery, ['cast', 'actors', 'starring'])) {
            return `${full.title} (${year}) cast: ${cast}.`;
        }
        if (this.includesAny(lowerQuery, ['director'])) {
            return `${full.title} (${year}) director: ${director ? director.name : 'N/A'}.`;
        }
        if (this.includesAny(lowerQuery, ['rating', 'score', 'imdb'])) {
            return `${full.title} (${year}) rating: ${rating}/10 on TMDb.`;
        }
        if (this.includesAny(lowerQuery, ['runtime', 'duration', 'length'])) {
            return `${full.title} (${year}) runtime: ${runtime}.`;
        }
        if (this.includesAny(lowerQuery, ['genre', 'type'])) {
            return `${full.title} (${year}) genres: ${genres}.`;
        }
        if (this.includesAny(lowerQuery, ['review', 'reviews'])) {
            if (reviews.results && reviews.results.length > 0) {
                const review = reviews.results[0];
                return `Review by ${review.author}: ${review.content.substring(0, 300)}${review.content.length > 300 ? '...' : ''}`;
            }
            return `${full.title} has no reviews available right now.`;
        }
        if (this.includesAny(lowerQuery, ['award', 'awards', 'nominated', 'nomination'])) {
            return `${full.title} awards: ${awardsText}`;
        }
        if (this.includesAny(lowerQuery, ['trailer'])) {
            return trailer ? `${full.title} trailer: https://www.youtube.com/watch?v=${trailer.key}` : `${full.title} trailer not available.`;
        }
        if (this.includesAny(lowerQuery, ['similar', 'like this', 'recommend'])) {
            return `${full.title} similar movies: ${similarTitles}.`;
        }

        return `${full.title} (${year}) • Rating ${rating}/10 • ${runtime} • ${genres}. ${this.createMovieSummary(full)}`;
    }

    includesAny(text, keywords) {
        return keywords.some(word => text.includes(word));
    }

    async findMovieFromQuery(query) {
        const lowerQuery = query.toLowerCase();
        const localMatch = this.moviesData.find(m =>
            lowerQuery.includes(m.title.toLowerCase()) ||
            m.title.toLowerCase().includes(lowerQuery.split(' ').find(word => word.length > 3) || '')
        );

        if (localMatch) return localMatch;

        try {
            const response = await fetch(`${this.baseUrl}/search/movie?api_key=${this.apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
            const data = await response.json();
            return data.results && data.results.length > 0 ? data.results[0] : null;
        } catch (error) {
            console.error('Chat search error:', error);
            return null;
        }
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
        this.applyFiltersAndRender();
    }

    clearFilters() {
        this.moodFilter.value = '';
        this.awardsFilter.value = '';
        this.genreFilter.value = '';
        this.sortSelect.value = 'popularity.desc';
        this.displayLimit = 12;
        this.applyFiltersAndRender();
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
        switch (award) {
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