import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import { Principal } from "@dfinity/principal";
import { opend } from "../../../declarations/opend";
import Button from "./Button";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {

  const [name, setName] = useState();
  const [owner, setOwner] = useState();
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [loaderHidden, setLoaderHidden] = useState(true);
  const [blur, setBlur] = useState();
  const [sellStatus, setSellStatus] = useState("");
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDislay, setDisplay] = useState(true);

  const id = props.id;

  const localHost = "http://localhost:8080/";
  const agent = new HttpAgent({host: localHost}) ;

  agent.fetchRootKey(); //TODO: When deploying Live, remove this
  let NFTActor;

  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id,
    });

    const name = await NFTActor.getName();
    const principalOwner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(
      new Blob([imageContent.buffer], 
        {type: "image/png"}));

    setName(name);
    setOwner(principalOwner.toText());
    setImage(image);
    
    if (props.page == "collection") {

      const nftIsListed = await opend.isListed(id);

      // if NFT is Listed
      if (nftIsListed) {
        setOwner("OpenD");
        setBlur({filter: "blur(4px)"});
        setSellStatus(" (Listed)");
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"}/>);
      }

    } else if (props.page == "discover"){
      const originalOwner = await opend.getOriginalOwner(id);

      // check if Original Owner is the same as the Current User ID
      if (originalOwner.toText() != CURRENT_USER_ID.toText()) {
        setButton(<Button handleClick={handleBuy} text={"Buy"}/>);
      }

      const price = await opend.getListedNFTPrice(id);
      setPriceLabel(<PriceLabel sellPrice={price.toString()} />);
    
    }
    
  }

  useEffect( () => {
    loadNFT();
  }, []);

  
  let price;
  function handleSell() {
    console.log("Sell Clicked");

    setPriceInput( <input
      placeholder="Price in DANG"
      type="number"
      className="price-input"
      value={price}
      
      // set value of price with each onChange
      onChange={(e) => price=e.target.value}
    />

    );

    setButton(<Button handleClick={sellItem} text={"Confirm"} />);
  }

  async function sellItem() {
    console.log("Sell Price: " + price);

    setBlur({filter: "blur(4px)"});
    setLoaderHidden(false);
    
    const listingResult = await opend.listItem(id, Number(price));

    // Make transfer if successful
    console.log("listing: " + listingResult); 
    if (listingResult == "Success") {
      const openDId = await opend.getOpenDCanisterID();
      const transferResult = await NFTActor.transferOwnership(openDId);

      console.log("transfer: " + transferResult);
      if (transferResult == "Success") {
        setLoaderHidden(true);
        setButton(); // remove button
        setPriceInput(); // remove input
        setOwner("OpenD");
        setSellStatus(" (Listed)");
      }
    }
  };

  async function handleBuy() {
    console.log("Buy was triggered");
    setLoaderHidden(false);

    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText("tlwi3-3aaaa-aaaaa-aaapq-cai")
    });

    // get seller and item price 
    const sellerId = await opend.getOriginalOwner(id);
    const itemPrice = await opend.getListedNFTPrice(id);

    // transfer money from buyer to seller
    const result = await tokenActor.transfer(sellerId, itemPrice);
    console.log(result);

    // transfer ownership
    if (result == "Success") {
      const transferResult = await opend.completePurchase(id, sellerId, CURRENT_USER_ID);
      console.log("purchase: " + transferResult);

      setLoaderHidden(true);
      setDisplay(false);
    };

  };

  return (
    <div style={{display: shouldDislay ? "inline" : "none"}} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
      </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text">{sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
