// dataWorker.js
self.onmessage = function (e) {
  const data = e.data; // Data yang dikirim dari thread utama

  const parseCoordinate = (str) => {
    const parts = str.split('.');
    return parseFloat(
      parts[0] + '.' + parts.slice(1).join('')
    );
  };

  const geojson = {
    type: 'FeatureCollection',
    features: data.map((item) => {
      const lat = parseCoordinate(item.lat);
      const lon = parseCoordinate(item.lon);

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          id_ph: item.id_ph,
          tanggal: item.tanggal,
          nilai_ph: item.nilai_ph,
          nilai_accel_x: item.nilai_accel_x,
          nilai_accel_y: item.nilai_accel_y,
          nilai_accel_z: item.nilai_accel_z,
          nilai_temperature: item.nilai_temperature,
          nilai_turbidity: item.nilai_turbidity,
        },
      };
    }),
  };

  // Mengirim data hasil pemrosesan kembali ke thread utama
  self.postMessage(geojson);
};
