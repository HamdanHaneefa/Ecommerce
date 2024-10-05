$(document).ready(function() {
    // Zoom functionality
    $('#product-image-container').on('mousemove', function(e) {
        const zoomArea = $('#zoom-area');
        const zoomedImage = $('#zoomed-image');
        const image = $('#product-image');
        const imageWidth = image.width();
        const imageHeight = image.height();

        const imageOffset = $(this).offset();
        const x = e.pageX - imageOffset.left;
        const y = e.pageY - imageOffset.top;

        const zoomLevel = 2; // Zoom level

        // Calculate new position for zoomed image
        const zoomedImageLeft = -(x * zoomLevel - (zoomArea.width() / 2));
        const zoomedImageTop = -(y * zoomLevel - (zoomArea.height() / 2));

        // Set zoomed image position and visibility
        zoomedImage.css({
            left: zoomedImageLeft + 'px',
            top: zoomedImageTop + 'px',
            display: 'block', // Show zoomed image
            width: imageWidth * zoomLevel + 'px',
            height: imageHeight * zoomLevel + 'px'
        });

        // Position the zoom area
        zoomArea.css({
            width: '100px', // Adjust as necessary
            height: '100px', // Adjust as necessary
            left: e.pageX - imageOffset.left - 50 + 'px', // Center the zoom area
            top: e.pageY - imageOffset.top - 50 + 'px', // Center the zoom area
            display: 'block' // Show zoom area
        });
    });

    // Hide zoom area and image when mouse leaves
    $('#product-image-container').on('mouseleave', function() {
        $('#zoom-area').hide();
        $('#zoomed-image').hide();
    });
});