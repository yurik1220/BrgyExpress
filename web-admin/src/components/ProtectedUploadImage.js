import React from 'react';
import '../styles/ProtectedUploadImage.css';

const ProtectedUploadImage = ({ src, alt, className = '', style = {}, ...props }) => {
    const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    return (
        <div className={`upload-img-wrapper ${className}`} style={{ display: 'inline-block', ...style }}>
            <img 
                src={src}
                alt={alt}
                className={className}
                style={style}
                {...props}
            />
            <div 
                className="upload-img-overlay"
                onContextMenu={handleContextMenu}
                onDragStart={(e) => e.preventDefault()}
            />
        </div>
    );
};

export default ProtectedUploadImage;

