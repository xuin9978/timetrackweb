import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    className?: string;
}

const DefaultIcon: React.FC<IconProps> = ({ size = 24, className, children, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
    >
        {children}
    </svg>
);

export const FocusIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <path d="M12 2C10.3431 2 9 3.34315 9 5C9 6.65685 10.3431 8 12 8C13.6569 8 15 6.65685 15 5C15 3.34315 13.6569 2 12 2Z" />
        <path d="M15.5 9H8.5C6.567 9 5 10.567 5 12.5V15C5 15.5523 5.44772 16 6 16H8L9.5 19.5L6.5 21.5C6.046 21.802 5.923 22.414 6.225 22.868C6.527 23.322 7.139 23.445 7.593 23.143L12 20.205L16.407 23.143C16.861 23.445 17.473 23.322 17.775 22.868C18.077 22.414 17.954 21.802 17.5 21.5L14.5 19.5L16 16H18C18.5523 16 19 15.5523 19 15V12.5C19 10.567 17.433 9 15.5 9Z" />
    </DefaultIcon>
);

export const ClassIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <path d="M12 2C10.3431 2 9 3.34315 9 5C9 6.65685 10.3431 8 12 8C13.6569 8 15 6.65685 15 5C15 3.34315 13.6569 2 12 2Z" />
        <path d="M4 20C4 18.8954 4.89543 18 6 18H11V12H7C5.34315 12 4 13.3431 4 15V20Z" />
        <path d="M20 20C20 18.8954 19.1046 18 18 18H13V12H17C18.6569 12 20 13.3431 20 15V20Z" />
        <path d="M12 22C12.5523 22 13 21.5523 13 21V11C13 10.4477 12.5523 10 12 10C11.4477 10 11 10.4477 11 11V21C11 21.5523 11.4477 22 12 22Z" />
        <path d="M4 22H20V23C20 23.5523 19.5523 24 19 24H5C4.44772 24 4 23.5523 4 23V22Z" />
    </DefaultIcon>
);

export const DailyIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <circle cx="12" cy="12" r="6" />
        <path d="M12 2V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M12 20V22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M4.93 4.93L6.34 6.34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M17.66 17.66L19.07 19.07" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M2 12H4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20 12H22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M6.34 17.66L4.93 19.07" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M19.07 4.93L17.66 6.34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </DefaultIcon>
);

export const EatIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <path d="M3 10C3 14.9706 7.02944 19 12 19C16.9706 19 21 14.9706 21 10H3Z" />
        <path d="M4 22H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 2L13 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 2L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </DefaultIcon>
);

export const ExerciseIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7Z" />
        <path d="M6 5H2V9H6V5Z" />
        <path d="M22 5H18V9H22V5Z" />
        <path d="M6 7H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8.5 14C7.11929 14 6 15.1193 6 16.5V19C6 19.5523 6.44772 20 7 20H8V23C8 23.5523 8.44772 24 9 24H10C10.5523 24 11 23.5523 11 23V20H13V23C13 23.5523 13.4477 24 14 24H15C15.5523 24 16 23.5523 16 23V20H17C17.5523 20 18 19.5523 18 19V16.5C18 15.1193 16.8807 14 15.5 14H8.5Z" />
    </DefaultIcon>
);

export const SubwayIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M6 2C4.34315 2 3 3.34315 3 5V16C3 18.2091 4.79086 20 7 20H17C19.2091 20 21 18.2091 21 16V5C21 3.34315 19.6569 2 18 2H6ZM6 6H18V12H6V6ZM7 17C7.55228 17 8 16.5523 8 16C8 15.4477 7.55228 15 7 15C6.44772 15 6 15.4477 6 16C6 16.5523 6.44772 17 7 17ZM17 17C17.5523 17 18 16.5523 18 16C18 15.4477 17.5523 15 17 15C16.4477 15 16 15.4477 16 16C16 16.5523 16.4477 17 17 17Z" />
        <path d="M4 20L2 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 20L22 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </DefaultIcon>
);

export const ReviewIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <path d="M16.5 3.5L20.5 7.5L9 19H5V15L16.5 3.5Z" fill="currentColor" />
        <path d="M14 6L18 10" stroke="currentColor" strokeWidth="0" />
    </DefaultIcon>
);

export const LoverIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
    </DefaultIcon>
);

export const PackIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" fill="currentColor" />
        <path d="M3 7L12 12L21 7" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        <path d="M12 22V12" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </DefaultIcon>
);

export const RestIcon: React.FC<IconProps> = (props) => (
    <DefaultIcon {...props}>
        <circle cx="6" cy="16" r="3" />
        <path d="M2 20H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 18H15C17.2091 18 19 16.2091 19 14V14C19 12.8954 18.1046 12 17 12H13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M15 6L19 6L15 10L19 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </DefaultIcon>
);

export const CustomIcons = {
    Focus: FocusIcon,
    Class: ClassIcon,
    Daily: DailyIcon,
    Eat: EatIcon,
    Exercise: ExerciseIcon,
    Subway: SubwayIcon,
    Review: ReviewIcon,
    Lover: LoverIcon,
    Pack: PackIcon,
    Rest: RestIcon,
};
