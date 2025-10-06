document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('weather-form');
  const input = document.getElementById('city');
  const result = document.getElementById('weather-result');
  const submitBtn = form.querySelector('button[type="submit"]');

  const modal = document.getElementById('modal');
  const yesBtn = document.getElementById('yes-location');
  const noBtn = document.getElementById('no-location');

  // Store original button text
  const originalButtonText = submitBtn.textContent;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = input.value.trim();
    if (!city) return;
    
    // Basic validation
    if (!/^[a-zA-Zа-яА-Я\s\-]+$/.test(city)) {
      showError('Пожалуйста, введите корректное название города');
      return;
    }
    
    await getWeather(city);
  });

  // Модальное окно
  modal.style.display = 'flex';

  yesBtn.addEventListener('click', async () => {
    modal.style.display = 'none';
    await getLocationByIP();
  });

  noBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  function fixUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https:${url}`;
  }

  async function getLocationByIP() {
    setLoadingState(true, 'Определение местоположения...');
    try {
      const res = await fetchWithTimeout('https://ipapi.co/json/', 5000);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      const city = data?.city || '';
      
      if (city) {
        input.value = city;
        await getWeather(city);
      } else {
        showError('Город по IP не определён');
      }
    } catch (err) {
      console.error('Location error:', err);
      showError('Ошибка при определении местоположения');
    } finally {
      setLoadingState(false);
    }
  }

  async function getWeather(city, retryCount = 0) {
    setLoadingState(true, 'Загрузка погоды...');

    try {
      const res = await fetchWithTimeout(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, 10000);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      // Validate response structure
      if (!data || !data.current_condition || !data.weather) {
        throw new Error('Invalid weather data received');
      }

      displayWeather(data, city);
      
    } catch (error) {
      console.error('Weather fetch error:', error);
      
      // Retry logic (max 2 retries)
      if (retryCount < 2 && (error.name === 'TypeError' || error.message.includes('Failed to fetch'))) {
        console.log(`Retrying... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return getWeather(city, retryCount + 1);
      }

      if (error.name === 'TimeoutError') {
        showError('Превышено время ожидания. Попробуйте позже.');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        showError('Ошибка соединения. Проверьте интернет-соединение.');
      } else if (error.message.includes('Invalid weather data')) {
        showError('Не удалось получить данные о погоде для этого города.');
      } else {
        showError('Произошла ошибка при получении погоды 😓');
      }
    } finally {
      setLoadingState(false);
    }
  }

  function displayWeather(data, requestedCity) {
    try {
      const area = data?.nearest_area?.[0]?.areaName?.[0]?.value || requestedCity;
      const region = data?.nearest_area?.[0]?.region?.[0]?.value || '';
      const country = data?.nearest_area?.[0]?.country?.[0]?.value || '';
      const current = data?.current_condition?.[0];
      const days = data?.weather;

      if (!current) {
        showError('Не удалось получить данные о погоде');
        return;
      }

      // Safe icon URL access
      const currentIcon = current.weatherIconUrl?.[0]?.value;
      const currentIconUrl = currentIcon ? fixUrl(currentIcon) : '';

      result.innerHTML = `
        <h2>${area}${region ? ', ' + region : ''}${country ? ', ' + country : ''}</h2>
        <div class="current">
          ${currentIconUrl ? `<img src="${currentIconUrl}" alt="icon" onerror="this.style.display='none'">` : ''}
          <div>
            <p>${current.weatherDesc?.[0]?.value || 'Нет данных'}</p>
            <p>🌡 ${current.temp_C}°C</p>
            <p>💧 ${current.humidity}%</p>
            <p>💨 ${current.windspeedKmph} км/ч</p>
          </div>
        </div>
        <h3>Прогноз на 3 дня</h3>
        <div class="forecast">
          ${days.slice(0, 3).map(day => {
            const hourly = day.hourly?.[4] || day.hourly?.[0] || {};
            const dayIcon = hourly.weatherIconUrl?.[0]?.value;
            const dayIconUrl = dayIcon ? fixUrl(dayIcon) : '';
            
            return `
              <div class="forecast-day">
                <p><strong>${day.date}</strong></p>
                ${dayIconUrl ? `<img src="${dayIconUrl}" alt="icon" onerror="this.style.display='none'">` : ''}
                <p>${hourly.weatherDesc?.[0]?.value || 'Нет данных'}</p>
                <p>🌡 Макс: ${day.maxtempC}°C</p>
                <p>🌡 Мин: ${day.mintempC}°C</p>
              </div>
            `;
          }).join('')}
        </div>
      `;
      
      result.classList.remove('hidden');
    } catch (error) {
      console.error('Display error:', error);
      showError('Ошибка при отображении данных о погоде');
    }
  }

  // Utility functions
  async function fetchWithTimeout(url, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        error.name = 'TimeoutError';
      }
      throw error;
    }
  }

  function setLoadingState(isLoading, message = '') {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.textContent = message || 'Загрузка...';
      result.innerHTML = `<div class="loading">${message || 'Загрузка...'}</div>`;
      result.classList.remove('hidden');
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = originalButtonText;
    }
  }

  function showError(message) {
    result.innerHTML = `
      <div class="error">
        <p>${message}</p>
      </div>
    `;
    result.classList.remove('hidden');
  }
});