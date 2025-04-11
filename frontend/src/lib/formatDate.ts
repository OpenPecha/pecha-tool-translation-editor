export function formatDate(input_date:string){
const date = new Date(input_date);

const day = date.getDate();
const month = date.toLocaleString('default', { month: 'long' });
const year = date.getFullYear();

const getOrdinalSuffix = (n) => {
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const formattedDate = `${day}${getOrdinalSuffix(day)} ${month.toLowerCase()} ${year}`;

return formattedDate
}