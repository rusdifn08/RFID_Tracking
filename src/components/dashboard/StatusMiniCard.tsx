interface StatusMiniCardProps {
 label: string;
 value: number;
 iconColor: string;
}

export default function StatusMiniCard({ label, value, iconColor }: StatusMiniCardProps) {
 return (
  <div
   className="bg-blue-500 relative flex flex-col items-center justify-between p-1.5 sm:p-2 md:p-2.5 h-full w-full bg-white rounded-md sm:rounded-lg md:rounded-xl transition-all duration-300 ease-out transform hover:-translate-y-1 shadow-sm border border-blue-500 hover:shadow-md hover:border-blue-600 group cursor-pointer"
  >
   <div className="flex-shrink-0 flex items-center justify-center mb-1 sm:mb-1.5">
    <div
     className="rounded-full"
     style={{
      backgroundColor: iconColor,
      width: 'clamp(0.375rem, 0.8vh, 0.625rem)',
      height: 'clamp(0.375rem, 0.8vh, 0.625rem)'
     }}
    />
   </div>
   <div className="flex flex-col items-center justify-center flex-1 w-full min-h-0">
    <h3
     className="font-extrabold tracking-widest transition-colors mb-0.5 sm:mb-1 text-center"
     style={{
      color: '#2979ff',
      textTransform: 'uppercase',
      fontSize: 'clamp(0.75rem, 1.5vh, 1rem)'
     }}
    >
     {label}
    </h3>
    <span
     className="font-bold leading-none tracking-tighter transition-all duration-500 ease-in-out transform scale-100 hover:scale-105 text-center"
     style={{
      color: '#003975',
      fontSize: 'clamp(1.25rem, 3vh, 2.5rem)'
     }}
    >
     {value.toLocaleString()}
    </span>
   </div>
  </div>
 );
}
