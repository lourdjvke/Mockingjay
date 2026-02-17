
export const generateId = () => Math.random().toString(36).substring(2, 11);

export const downloadTemplate = (state: any) => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mockingjay-template-${Date.now()}.json`;
  a.click();
};

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
