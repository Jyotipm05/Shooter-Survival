// -----JS CODE-----

script.createEvent('TouchStartEvent').bind(function (eventData) {
    print('Touch Start');
});

script.createEvent('TouchMoveEvent').bind(function (eventData) {
    print('Touch Move');
});

script.createEvent('TouchEndEvent').bind(function (eventData) {
    print('Touch End');
    global.startGame();
});

script.createEvent('TapEvent').bind(function (eventData) {
    print('Tap');
    global.startGame();
});