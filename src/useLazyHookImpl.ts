import { useState } from "react";

const useLazyHookImpl = () => useState('this was loaded from a lazy thing')

export default useLazyHookImpl;