// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * ORVYN StrategyRegistry, Chapter 1.
 *
 * A strategy here is a name and a short, readable payload: the rules and
 * target weights a simulated portfolio was built with. Nothing on this
 * contract moves money, holds custody or places an order.
 *
 * There is no owner and no admin function. Publishing is open, the author is
 * the address that sent the transaction, and the record can never be edited.
 * The event is the index; the storage is the source of truth for a direct
 * read. Both are deliberately small enough to inspect on a block explorer.
 */
contract StrategyRegistry {
    struct Strategy {
        address author;
        string name;
        string payload;
        uint64 publishedAt;
    }

    /// 64 bytes of name and 512 bytes of payload bound the cost of one record.
    uint256 public constant MAX_NAME_BYTES = 64;
    uint256 public constant MAX_PAYLOAD_BYTES = 512;

    Strategy[] private records;
    mapping(address author => uint256[] ids) private authorRecords;

    event StrategyPublished(
        uint256 indexed id,
        address indexed author,
        string name,
        string payload
    );

    error EmptyName();
    error NameTooLong(uint256 length);
    error EmptyPayload();
    error PayloadTooLong(uint256 length);

    /**
     * Publish a strategy under the caller's address. The id is the array
     * index, so it is stable and can be read back without a second lookup.
     */
    function publish(string calldata name, string calldata payload) external returns (uint256 id) {
        uint256 nameLength = bytes(name).length;
        uint256 payloadLength = bytes(payload).length;

        if (nameLength == 0) revert EmptyName();
        if (nameLength > MAX_NAME_BYTES) revert NameTooLong(nameLength);
        if (payloadLength == 0) revert EmptyPayload();
        if (payloadLength > MAX_PAYLOAD_BYTES) revert PayloadTooLong(payloadLength);

        id = records.length;
        records.push(
            Strategy({
                author: msg.sender,
                name: name,
                payload: payload,
                publishedAt: uint64(block.timestamp)
            })
        );
        authorRecords[msg.sender].push(id);

        emit StrategyPublished(id, msg.sender, name, payload);
    }

    /// How many strategies exist. Ids run from 0 to count() - 1.
    function count() external view returns (uint256) {
        return records.length;
    }

    /// One strategy by id. Reverts for an id that has not been published.
    function get(uint256 id) external view returns (Strategy memory) {
        return records[id];
    }

    /// Every id published by one address, oldest first.
    function idsOf(address author) external view returns (uint256[] memory) {
        return authorRecords[author];
    }
}
