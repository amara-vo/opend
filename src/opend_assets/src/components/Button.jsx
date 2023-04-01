import React from "react";

function Button(props) {
    return (
        <div className="Chip-root makeStyles-chipBlue-108 Chip-clickable">
            <span

                // passed in function gets triggered when clicked
              onClick={props.handleClick}
              className="form-Chip-label"
            >
              {props.text}
            </span>
        </div>
    )
}

export default Button;