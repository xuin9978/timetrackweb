import React from 'react';
import { CustomIcons } from './components/CustomIcons';

const IconPreview = () => {
    const iconNames = Object.keys(CustomIcons) as Array<keyof typeof CustomIcons>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold mb-8 text-gray-200">Custom Icon Set Preview</h1>
            <div className="grid grid-cols-5 gap-8 bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                {iconNames.map((name) => {
                    const Icon = CustomIcons[name];
                    return (
                        <div key={name} className="flex flex-col items-center gap-3 group cursor-pointer">
                            <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center transition-all group-hover:bg-blue-600 group-hover:scale-110 shadow-lg">
                                <Icon size={32} className="text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
                                {name}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-8 text-gray-500 text-sm">
                Hover to see interaction state
            </div>
        </div>
    );
};

export default IconPreview;
