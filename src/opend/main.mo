import Principal "mo:base/Principal";
import NFTActorClass "../NFT/nft";
import Cycles "mo:base/ExperimentalCycles";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import List "mo:base/List";
import Iter "mo:base/Iter";

actor OpenD {

    // custom data type
    private type Listing = {
        itemOwner: Principal;
        itemPrice: Nat;

        // could hold a bunch more info in the future
    };

    var mapOfNFTs = HashMap.HashMap<Principal, NFTActorClass.NFT>(1, Principal.equal, Principal.hash);
    var mapOfOwners = HashMap.HashMap<Principal, List.List<Principal>>(1, Principal.equal, Principal.hash);
    var mapOfListings = HashMap.HashMap<Principal, Listing>(1, Principal.equal, Principal.hash);

    public shared(msg) func mint(imgData: [Nat8], name: Text) : async Principal {
        // access the identity of the user who calls this method
        let owner : Principal = msg.caller;

        Debug.print(debug_show(Cycles.balance()));
        // assign cycles so it can be created
        Cycles.add(100_500_000_000);
        // initialize new NFT
        let newNFT = await NFTActorClass.NFT(name, owner, imgData);
        Debug.print(debug_show(Cycles.balance()));
        
        // get the ID of the canister that our new NFT is hosted on
        let newNFTPrincipal = await newNFT.getCanisterId();

        // add to the HashMap
        mapOfNFTs.put(newNFTPrincipal, newNFT);

        addToOwnershipMap(owner, newNFTPrincipal);

        return newNFTPrincipal;
    };
    

    private func addToOwnershipMap(owner: Principal, nftId: Principal) {

        // get hold of current NFTs that owner has
        var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(owner)) {
            case null List.nil<Principal>();
            case (?result) result;
        };

        // set list to be the newly updated one
        ownedNFTs := List.push(nftId, ownedNFTs);

        // add to HashMap with the new NFT list
        mapOfOwners.put(owner, ownedNFTs);

    };

    public query func getOwnedNFTs(user: Principal) : async [Principal]{
        var userNFTs : List.List<Principal> = switch (mapOfOwners.get(user)) {
            case null List.nil<Principal>();
            case (?result) result;
        };

        // turn list into an array
        return List.toArray(userNFTs);
    };

    public query func getListedNFTs() : async [Principal] {
        return Iter.toArray(mapOfListings.keys()); // array of ids
    };

    public shared(msg) func listItem(id: Principal, price: Nat) : async Text {
        var item : NFTActorClass.NFT = switch (mapOfNFTs.get(id)) {
            case null return "NFT does not exist.";
            case (?result) result;
        };

        // get the owner of NFT
        let owner = await item.getOwner();

        // verify if owner is the same as the User caller id
        if (Principal.equal(owner, msg.caller)) {
            let newListing : Listing = {
                itemOwner = owner;
                itemPrice = price;
            };

            mapOfListings.put(id, newListing);
            return "Success";
        } else {
            return "Error: You don't own the NFT."
        }

    };

    public query func getOpenDCanisterID() : async Principal {
        return Principal.fromActor(OpenD);
    };

    public query func isListed(id: Principal) : async Bool {
        if (mapOfListings.get(id) != null) {
            return true;
        } else {
            return false;
        }
    };

    // get original owner of NFT
    public query func getOriginalOwner(id: Principal) : async Principal {
        var listing : Listing = switch (mapOfListings.get(id)) {
            case null return Principal.fromText("");
            case (?result) result;
        };

        return listing.itemOwner;
    };

    public query func getListedNFTPrice(id: Principal) : async Nat {
        var listing : Listing = switch (mapOfListings.get(id)) {
            case null return 0;
            case (?result) result;
        };

        return listing.itemPrice;
    };

    public shared(msg) func completePurchase(id: Principal, ownerId: Principal, newOwnerId: Principal) : async Text {
        var purchasedNFT : NFTActorClass.NFT = switch (mapOfNFTs.get(id)) {
            case null return "NFT doesn't exist";
            case (?result) result
        };

        let transferResult = await purchasedNFT.transferOwnership(newOwnerId);

        if (transferResult == "Success") {
            mapOfListings.delete(id);

            // get lists of NFTs that previous owner owned
            var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(ownerId)) {
                case null List.nil<Principal>();
                case (?result) result;
            };

            ownedNFTs := List.filter(ownedNFTs, func (listItemId: Principal) : Bool {
                // return true if listItemId does not equal NFT that's being purchased
                // if false it won't be added to the list
                return listItemId != id;
            });

            addToOwnershipMap(newOwnerId, id);
            return "Success";
        } else {
            return transferResult;
        }
    };

};
