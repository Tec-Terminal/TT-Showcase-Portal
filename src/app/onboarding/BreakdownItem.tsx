const BreakdownItem = ({ step, title, date, amount, status }: any) => {
  return (
    <div className="flex items-center justify-between pb-6 border-b border-gray-200 last:border-0 last:pb-0">
      <div className="flex gap-4 items-center">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
            step === 1
              ? "bg-indigo-600 text-white"
              : "bg-gray-50 border border-gray-200 text-gray-400"
          }`}
        >
          {step}
        </div>
        <div>
          <p className="font-normal text-gray-900">{title}</p>
          <p className="text-xs text-gray-400 font-normal">{date}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900">₦{amount}</p>
        {status && (
          <p className="text-xs font-medium text-indigo-600 mt-1">
            {status}
          </p>
        )}
      </div>
    </div>
  );
};

export default BreakdownItem;
