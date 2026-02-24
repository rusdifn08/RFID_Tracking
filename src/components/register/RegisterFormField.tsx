import { memo, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface RegisterFormFieldProps {
 label: string;
 name: string;
 type?: 'text' | 'password' | 'select';
 placeholder?: string;
 required?: boolean;
 error?: string;
 register: UseFormRegisterReturn;
 options?: string[];
 showPassword?: boolean;
 onTogglePassword?: () => void;
}

const RegisterFormField = memo(forwardRef<HTMLInputElement | HTMLSelectElement, RegisterFormFieldProps>(
 ({ label, name, type = 'text', placeholder, required, error, register, options, showPassword, onTogglePassword }, ref) => {
  const inputClasses = `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all placeholder-gray-400 text-gray-900 bg-white ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
   }`;

  if (type === 'select') {
   const { onChange, onBlur, name: registerName, ref: registerRef } = register;
   return (
    <div className="md:col-span-1">
     <label htmlFor={name} className="block text-sm font-semibold text-gray-900 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
     </label>
     <select
      id={name}
      name={registerName}
      ref={(e) => {
        registerRef(e);
        if (typeof ref === 'function') {
          ref(e);
        } else if (ref) {
          (ref as any).current = e;
        }
      }}
      onChange={(e) => {
        onChange(e); // Panggil react-hook-form onChange
        console.log(`🔵 [RegisterFormField] Select ${name} changed:`, e.target.value);
      }}
      onBlur={onBlur}
      className={`${inputClasses} cursor-pointer`}
     >
      <option value="">Pilih {label}</option>
      {options?.map(option => (
       <option key={option} value={option}>{option}</option>
      ))}
     </select>
     {error && (
      <p className="mt-1 text-xs text-red-600">{error}</p>
     )}
    </div>
   );
  }

  if (type === 'password') {
   const { onChange, onBlur, name: registerName, ref: registerRef } = register;
   return (
    <div className="md:col-span-1">
     <label htmlFor={name} className="block text-sm font-semibold text-gray-900 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
     </label>
     <div className="relative">
      <input
       type={showPassword ? "text" : "password"}
       id={name}
       name={registerName}
       ref={(e) => {
        registerRef(e);
        if (typeof ref === 'function') {
          ref(e);
        } else if (ref) {
          (ref as any).current = e;
        }
       }}
       onChange={(e) => {
        onChange(e); // Panggil react-hook-form onChange
        console.log(`🔵 [RegisterFormField] Password changed:`, e.target.value ? '***' : '(empty)');
       }}
       onBlur={onBlur}
       className={inputClasses + ' pr-10'}
       placeholder={placeholder}
      />
      <button
       type="button"
       onClick={onTogglePassword}
       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
      >
       {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
     </div>
     {error && (
      <p className="mt-1 text-xs text-red-600">{error}</p>
     )}
    </div>
   );
  }

  return (
   <div className="md:col-span-1">
    <label htmlFor={name} className="block text-sm font-semibold text-gray-900 mb-1.5">
     {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
     type={type}
     id={name}
     {...register}
     className={inputClasses}
     placeholder={placeholder}
     ref={ref as React.Ref<HTMLInputElement>}
    />
    {error && (
     <p className="mt-1 text-xs text-red-600">{error}</p>
    )}
   </div>
  );
 }
));

RegisterFormField.displayName = 'RegisterFormField';

export default RegisterFormField;

