import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import useZoomPan from 'components/utils/hooks/useZoomPan';
import './index.scss';

const propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  resetKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const defaultProps = {
  children: null,
  className: '',
  resetKey: 0,
};

const ZoomWrapper = ({ children, className, resetKey }) => {
  const {
    containerRef,
    innerRef,
    scale,
    cursor,
    min,
    max,
    onDoubleClick,
    onSliderChange,
  } = useZoomPan(resetKey);

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <div
      className={cx('zoom-wrapper', className)}
      onDoubleClick={onDoubleClick}
      ref={containerRef}
      style={{ cursor }}
    >
      <div
        className="zoom-wrapper-inner"
        ref={innerRef}
      >
        {children}
      </div>
      <div
        className="zoom-wrapper-controls"
        onDoubleClick={stopPropagation}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
      >
        <span className="zoom-wrapper-label">
          {`${Math.round(scale * 100)}%`}
        </span>
        <input
          aria-label="Zoom"
          className="zoom-wrapper-slider"
          max={max}
          min={min}
          onChange={onSliderChange}
          step={0.1}
          type="range"
          value={scale}
        />
      </div>
    </div>
  );
};

ZoomWrapper.propTypes = propTypes;
ZoomWrapper.defaultProps = defaultProps;

export default ZoomWrapper;
