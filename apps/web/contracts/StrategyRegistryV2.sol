// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * ORVYN StrategyRegistry v2, Chapter 1 launch.
 *
 * Same readable publish record as v1, plus follows. No owner, no admin and no
 * function that moves funds. A follow is a public signal, not a position.
 */
contract StrategyRegistryV2 {
    struct Strategy {
        address author;
        string name;
        string payload;
        uint64 publishedAt;
    }

    uint256 public constant MAX_NAME_BYTES = 64;
    uint256 public constant MAX_PAYLOAD_BYTES = 512;

    Strategy[] private records;
    mapping(address author => uint256[] ids) private authorRecords;

    mapping(uint256 id => mapping(address follower => bool)) private following;
    mapping(uint256 id => address[] followers) private followerList;
    mapping(address follower => uint256[] ids) private followingList;

    event StrategyPublished(uint256 indexed id, address indexed author, string name, string payload);
    event Followed(uint256 indexed id, address indexed follower);
    event Unfollowed(uint256 indexed id, address indexed follower);

    error EmptyName();
    error NameTooLong(uint256 length);
    error EmptyPayload();
    error PayloadTooLong(uint256 length);
    error UnknownStrategy();
    error CannotFollowSelf();
    error AlreadyFollowing();
    error NotFollowing();

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

    function follow(uint256 id) external {
        if (id >= records.length) revert UnknownStrategy();
        if (records[id].author == msg.sender) revert CannotFollowSelf();
        if (following[id][msg.sender]) revert AlreadyFollowing();

        following[id][msg.sender] = true;
        followerList[id].push(msg.sender);
        followingList[msg.sender].push(id);

        emit Followed(id, msg.sender);
    }

    function unfollow(uint256 id) external {
        if (!following[id][msg.sender]) revert NotFollowing();

        following[id][msg.sender] = false;
        _removeAddress(followerList[id], msg.sender);
        _removeUint(followingList[msg.sender], id);

        emit Unfollowed(id, msg.sender);
    }

    function count() external view returns (uint256) {
        return records.length;
    }

    function get(uint256 id) external view returns (Strategy memory) {
        return records[id];
    }

    function idsOf(address author) external view returns (uint256[] memory) {
        return authorRecords[author];
    }

    function followersOf(uint256 id) external view returns (address[] memory) {
        return followerList[id];
    }

    function followingOf(address account) external view returns (uint256[] memory) {
        return followingList[account];
    }

    function isFollowing(uint256 id, address follower) external view returns (bool) {
        return following[id][follower];
    }

    function _removeAddress(address[] storage list, address value) private {
        uint256 length = list.length;
        for (uint256 i = 0; i < length; i++) {
            if (list[i] == value) {
                list[i] = list[length - 1];
                list.pop();
                return;
            }
        }
    }

    function _removeUint(uint256[] storage list, uint256 value) private {
        uint256 length = list.length;
        for (uint256 i = 0; i < length; i++) {
            if (list[i] == value) {
                list[i] = list[length - 1];
                list.pop();
                return;
            }
        }
    }
}
