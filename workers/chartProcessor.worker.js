self.onmessage = ({ data: { rawData, config } }) => {
  const sampledData = [];
  for (let i = 0; i < rawData.length; i += config.SAMPLING_INTERVAL) {
    const batch = rawData.slice(i, i + config.SAMPLING_INTERVAL);
    const avgValue = batch.reduce((sum, d) => sum + d.value, 0) / batch.length;
    sampledData.push({
      ...batch[0],
      value: avgValue,
    });
  }
  postMessage(sampledData);
  close();
};
