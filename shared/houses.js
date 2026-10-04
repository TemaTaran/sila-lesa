// Дома «Силы Леса» — по описаниям из их календаря Lite PMS (04.10.2026).
// type — ключ цены в NIGHTS; map — номер на их схеме парка.
window.HOUSES = [
  { id: 'ogon', type: 'ogon', name: 'Огонь', full: 'Дом «Огонь»', map: 7, area: 20, guests: 'до 2 гостей',
    times: '14:00 / 12:00', photo: 'ogon.jpg',
    perks: ['ванна', 'паровой камин', 'проектор с фильмами', 'кофемашина'],
    line: 'Тёплый свет, паровой камин и ванна у окна в лес.' },
  { id: 'zemlya', type: 'zemlya', name: 'Земля', full: 'Дом «Земля» с купелью', map: 10, area: 25, guests: '2 взрослых и ребёнок',
    times: '16:00 / 14:00', photo: 'zemlya.jpg', pets: true,
    perks: ['купель', 'стена из мха', 'ванна', 'можно с собакой'],
    line: 'Живой мох на стене, купель на улице. Можно приехать с собакой.' },
  { id: 'voda', type: 'voda', name: 'Вода', full: 'Дом «Вода» с купелью', map: 8, area: 30, guests: '2 взрослых и 2 детей',
    times: '14:00 / 12:00', photo: 'voda.jpg',
    perks: ['большая ванна', 'купель', 'детская с двухъярусной кроватью', 'проектор'],
    line: 'Большая ванна под светящейся аркой и отдельная детская.' },
  { id: 'vozduh', type: 'vozduh', name: 'Воздух', full: 'Дом «Воздух»', map: 9, area: 25, guests: '2 взрослых и ребёнок',
    times: '16:00 / 14:00', photo: 'vozduh-terrasa.jpg', photo2: 'vozduh.jpg',
    perks: ['на высоте 6 метров', 'вид на озеро', 'ванна', 'проектор'],
    line: 'Поднят на шесть метров: из окна — озеро и верхушки сосен.' },
  { id: 'lesnoy1', type: 'lesnoy1', name: 'Лесной дом №1', full: 'Лесной дом с купелью №1', map: 1, area: 22, guests: 'до 4 гостей',
    times: '14:00 / 12:00', photo: 'lesnoy.jpg', perks: ['купель', 'спальня на втором этаже', 'кухня'] },
  { id: 'lesnoy2', type: 'lesnoy2', name: 'Лесной дом №2', full: 'Лесной дом с купелью №2', map: 2, area: 22, guests: 'до 4 гостей',
    times: '14:00 / 12:00', photo: 'lesnoy-leto.jpg', perks: ['купель', 'спальня на втором этаже', 'кухня'] },
  { id: 'lesnoy3', type: 'lesnoy3', name: 'Лесной дом №3', full: 'Лесной дом №3', map: 3, area: 22, guests: 'до 4 гостей',
    times: '14:00 / 12:00', photo: 'lesnoy-kuhnya.jpg', pets: true, perks: ['можно с собакой', 'спальня на втором этаже', 'кухня'] },
  { id: 'vanna', type: 'vanna', name: 'Дом с ванной', full: 'Дом с ванной №4', map: 4, area: 18, guests: 'до 2 гостей',
    times: '16:00 / 14:00', photo: 'vanna-okno.jpg', perks: ['ванна у панорамного окна', 'кухня'] },
  { id: 'solnechny5', type: 'solnechny5', name: 'Солнечный дом №5', full: 'Солнечный дом №5', map: 5, area: 18, guests: '2 взрослых и ребёнок',
    times: '16:00 / 14:00', photo: 'solnechny.jpg', perks: ['вид на озеро и шатры', 'кухня'] },
  { id: 'solnechny6', type: 'solnechny6', name: 'Солнечный дом №6', full: 'Солнечный дом №6', map: 6, area: 18, guests: '2 взрослых и ребёнок',
    times: '16:00 / 14:00', photo: 'solnechny.jpg', pets: true, perks: ['можно с собакой', 'вид на озеро', 'кухня'] },
];

window.RUB = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
window.DAY = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return {
    wd: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()],
    wdLong: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'][d.getDay()],
    n: d.getDate(),
    month: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][d.getMonth()],
    weekend: d.getDay() === 5 || d.getDay() === 6,
  };
};
