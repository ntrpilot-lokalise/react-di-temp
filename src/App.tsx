import React, { Suspense, useState } from 'react';
import { SomeModuleDefinition, SomeTopLevelComponent } from './SomeModule/SomeModule';
import { lazyImplementation, OverrideModuleImplmentation } from './useDi2';

const useProvidedHook = lazyImplementation(() => import('./useLazyHookImpl'))

function App() {
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <OverrideModuleImplmentation<SomeModuleDefinition>
        someRequiredFunction={() => 123}
        useProvidedHook={useProvidedHook}
        >
          <SomeTopLevelComponent />
      </OverrideModuleImplmentation>      
    </Suspense>
  );
}

export default App;
