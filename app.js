document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('weather-form');
  const input = document.getElementById('city');
  const result = document.getElementById('weather-result');

  const modal = document.getElementById('modal');
  const yesBtn = document.getElementById('yes-location');
  const noBtn = document.getElementById('no-location');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = input.value.trim();
    if (!city) return;
    getWeather(city);
  });

  // Модальное окно
  modal.style.display = 'flex';

  yesBtn.addEventListener('click', async () => {
    modal.style.display = 'none';
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      const city = data?.city || '';
      if (city) {
        input.value = city;
        getWeather(city);
      } else {
        result.innerHTML = 'Город по IP не определён';
        result.classList.remove('hidden');
      }
    } catch (err) {
      result.innerHTML = 'Ошибка при определении местоположения';
      result.classList.remove('hidden');
    }
  });

  noBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  function fixUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https:${url}`;
  }

  async function getWeather(city) {
    result.innerHTML = 'Загрузка...';
    result.classList.remove('hidden');

    try {
      const res = await fetch(`https://wttr.in/${city}?format=j1`);
      const data = await res.json();

      const area = data?.nearest_area?.[0]?.areaName?.[0]?.value || city;
      const region = data?.nearest_area?.[0]?.region?.[0]?.value || '';
      const country = data?.nearest_area?.[0]?.country?.[0]?.value || '';
      const current = data?.current_condition?.[0];
      const days = data?.weather;

      if (!current) {
        result.innerHTML = 'Не удалось получить погоду 😢';
        return;
      }

      result.innerHTML = `
        <h2>${area}, ${region}, ${country}</h2>
        <div class="current">
          <img src="${fixUrl(current.weatherIconUrl[0].value)}" alt="icon">
          <p>${current.weatherDesc[0].value}</p>
          <p>🌡 ${current.temp_C}°C</p>
          <p>💧 ${current.humidity}%</p>
          <p>💨 ${current.windspeedKmph} км/ч</p>
        </div>
        <h3>Прогноз на 3 дня</h3>
        <div class="forecast">
          ${days.slice(0, 3).map(day => `
            <div class="forecast-day">
              <p><strong>${day.date}</strong></p>
              <img src="${fixUrl(day.hourly[4].weatherIconUrl[0].value)}" alt="icon">
              <p>${day.hourly[4].weatherDesc[0].value}</p>
              <p>🌡 Макс: ${day.maxtempC}°C</p>
              <p>🌡 Мин: ${day.mintempC}°C</p>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      result.innerHTML = 'Произошла ошибка 😓';
    }
  }
});
