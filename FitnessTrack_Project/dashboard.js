document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Set username immediately from localStorage
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        document.getElementById('username').textContent = savedUsername;
        document.getElementById('welcomeUsername').textContent = savedUsername;
    }

    // Check authentication state
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Load user data to ensure it's up to date
            loadUserData(user.uid);
            loadDashboardData(user.uid);
        } else {
            // No user is signed in, redirect to login
            window.location.href = 'login.html';
        }
    });

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        firebase.auth().signOut()
            .then(() => {
                // Clear stored data
                localStorage.removeItem('username');
                localStorage.removeItem('theme');
                window.location.href = 'login.html';
            })
            .catch((error) => {
                console.error('Logout Error:', error);
                showAlert('Failed to log out. Please try again.', 'danger');
            });
    });

    // Add settings link handler
    document.querySelector('a[href="settings.html"]').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'settings.html';
    });
});

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// Load user data from Firebase
function loadUserData(userId) {
    const userRef = firebase.database().ref('users/' + userId);
    userRef.once('value').then((snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            // Update stored username if it's different
            if (userData.username && userData.username !== localStorage.getItem('username')) {
                localStorage.setItem('username', userData.username);
                document.getElementById('username').textContent = userData.username;
                document.getElementById('welcomeUsername').textContent = userData.username;
            }
        }
    }).catch((error) => {
        console.error('Error loading user data:', error);
        showAlert('Failed to load user data', 'danger');
    });
}

// Load dashboard-specific data
function loadDashboardData(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // Load today's food entries
    loadTodaysFoodEntries(userId, today);
    
    // Load today's exercise entries
    loadTodaysExerciseEntries(userId, today);
    
    // Load user's goals and calculate remaining calories
    loadUserGoals(userId);
}

function loadTodaysFoodEntries(userId, today) {
    firebase.database().ref(`foodEntries/${userId}/${today}`).once('value')
        .then((snapshot) => {
            const entries = snapshot.val() || {};
            let totalCalories = 0;
            let totalProtein = 0;
            let totalCarbs = 0;
            let totalFat = 0;

            // Calculate totals from all meals
            Object.values(entries).forEach(meal => {
                Object.values(meal).forEach(entry => {
                    totalCalories += entry.calories || 0;
                    totalProtein += entry.protein || 0;
                    totalCarbs += entry.carbs || 0;
                    totalFat += entry.fat || 0;
                });
            });

            // Update dashboard UI
            updateNutritionDisplay(totalCalories, totalProtein, totalCarbs, totalFat);
        })
        .catch(error => {
            console.error('Error loading food entries:', error);
        });
}

function loadTodaysExerciseEntries(userId, today) {
    firebase.database().ref(`exerciseEntries/${userId}/${today}`).once('value')
        .then((snapshot) => {
            const entries = snapshot.val() || {};
            let totalCaloriesBurned = 0;
            let totalDuration = 0;

            Object.values(entries).forEach(entry => {
                totalCaloriesBurned += entry.caloriesBurned || 0;
                totalDuration += entry.duration || 0;
            });

            // Update exercise stats in UI
            updateExerciseDisplay(totalCaloriesBurned, totalDuration);
        })
        .catch(error => {
            console.error('Error loading exercise entries:', error);
        });
}

function loadUserGoals(userId) {
    firebase.database().ref(`users/${userId}/nutritionalGoals`).once('value')
        .then((snapshot) => {
            const goals = snapshot.val() || {};
            updateGoalsDisplay(goals);
        })
        .catch(error => {
            console.error('Error loading user goals:', error);
        });
}

function updateNutritionDisplay(calories, protein, carbs, fat) {
    // Update nutrition cards with today's totals
    if (document.getElementById('totalCalories')) {
        document.getElementById('totalCalories').textContent = Math.round(calories);
    }
    if (document.getElementById('totalProtein')) {
        document.getElementById('totalProtein').textContent = Math.round(protein) + 'g';
    }
    if (document.getElementById('totalCarbs')) {
        document.getElementById('totalCarbs').textContent = Math.round(carbs) + 'g';
    }
    if (document.getElementById('totalFat')) {
        document.getElementById('totalFat').textContent = Math.round(fat) + 'g';
    }
}

function updateExerciseDisplay(caloriesBurned, duration) {
    // Update exercise statistics
    if (document.getElementById('caloriesBurned')) {
        document.getElementById('caloriesBurned').textContent = Math.round(caloriesBurned);
    }
    if (document.getElementById('exerciseDuration')) {
        document.getElementById('exerciseDuration').textContent = duration + ' min';
    }
}

function updateGoalsDisplay(goals) {
    // Update progress bars and remaining calories
    if (goals.dailyCalories) {
        const totalCalories = parseInt(document.getElementById('totalCalories')?.textContent || '0');
        const remaining = goals.dailyCalories - totalCalories;
        if (document.getElementById('remainingCalories')) {
            document.getElementById('remainingCalories').textContent = Math.max(0, remaining);
        }
        
        // Update progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            const percentage = Math.min(100, (totalCalories / goals.dailyCalories) * 100);
            progressBar.style.width = percentage + '%';
        }
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-50 start-50 translate-middle`;
    alertDiv.style.zIndex = "9999";
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}