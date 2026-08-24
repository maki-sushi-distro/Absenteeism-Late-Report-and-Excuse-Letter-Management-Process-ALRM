export function Login() {
  return (
    <>
      <div className="grid grid-cols-2">
        <div className="bg-blue-950 w-xl h-screen"></div>
        <div className="flex flex-col justify-center">
          <div className="flex flex-col items-center mr-40 gap-2">
            <h1 className="font-bold text-5xl text-blue-950">Welcome Back!</h1>
            <h4>Sign in to your account</h4>
            <div className="mt-10 mb-10">
              <button className="border rounded-md text-blue-950 border-blue-800 px-10 py-2">
                <h3 className="text-xl font-semibold">Sign in with LV Email</h3>
              </button>
            </div>
            <h5 className="text-gray-500">
              Please use your official LV email address to log in.
            </h5>
          </div>
        </div>
      </div>
    </>
  );
}
